import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Post,
  UnauthorizedException,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UserService } from '../../user/services/user.service';
import { AdminService } from '../../user/services/admin.service';
import { Public } from '../../common/decorators/public.decorators';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthResponseDto } from '../dto/authResponse.dto';
import { CreateUserDto } from '../../user/dto/user/create-user.dto';
import { JwtService } from '@nestjs/jwt';
import { RefreshTokenDto } from '../dto/refreshToken.dto';
import { SignInDto } from '../dto/signin.dto';
import * as bcrypt from 'bcryptjs';
import { JwtAuthGuard } from '../guards/auth.guard';
import { GetUserDto } from '../../user/dto/user/get-user.dto';
import { plainToInstance } from 'class-transformer';
import { ValidationExceptionFilter } from '../../common/filters/validation-exception.filter';
import { SerializeInterceptor } from '../../common/interceptors/serialize.interceptor';
import { GetAdminDto } from '../../user/dto/admin/get-admin.dto';
import { ConfigService } from '@nestjs/config';

@ApiTags('auth')
@Controller('auth')
@UseFilters(ValidationExceptionFilter)
@UseInterceptors(SerializeInterceptor)
export class AuthController {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly adminService: AdminService,
    private readonly configService: ConfigService,
  ) { }

  @ApiOperation({ summary: 'User sign-up' })
  @ApiResponse({ status: 400, description: 'User already exists' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @Public()
  @Post('/sign-up')
  @HttpCode(200)
  async createUser(@Body() body: CreateUserDto): Promise<AuthResponseDto> {
    const existingUser = await this.userService.findByEmail(body.email);
    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    const newUser = await this.userService.createUser(body);
    const payload = { email: newUser.email, sub: newUser.id };
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('app.jwtExpirationTime')
    });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    await this.userService.saveRefreshToken(newUser.id.toString(), refreshToken);
    this.userService.addLoggedInUser(newUser.id.toString());

    return {
      user: plainToInstance(GetUserDto, newUser),
      accessToken,
      refreshToken,
    };
  }

  @ApiOperation({ summary: 'User sign-in' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid credentials' })
  @Public()
  @Post('/sign-in')
  @HttpCode(200)
  async signin(@Body() signInDto: SignInDto): Promise<AuthResponseDto> {

    const user = await this.userService.findByEmail(signInDto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatch = await bcrypt.compare(signInDto.password, user.password);

    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { email: user.email, sub: user.id };

    const jwtSecret = this.configService.get<string>('app.jwtSecret');
    const jwtExpirationTime = this.configService.get<string>('app.jwtExpirationTime');

    const accessToken = this.jwtService.sign(payload, {
      secret: jwtSecret,
      expiresIn: jwtExpirationTime,
    });
    const refreshToken = this.jwtService.sign(payload, {
      secret: jwtSecret,
      expiresIn: '7d',
    });

    await this.userService.saveRefreshToken(user.id.toString(), refreshToken);
    this.userService.addLoggedInUser(user.id.toString());

    const response = {
      user: plainToInstance(GetUserDto, user),
      accessToken,
      refreshToken,
    };

    return response;
  }

  @ApiOperation({ summary: 'Admin sign-in' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid credentials' })
  @Public()
  @Post('/sign-in/admin')
  @HttpCode(200)
  async adminSignin(@Body() signInDto: SignInDto): Promise<AuthResponseDto> {
    const { email, password } = signInDto;

    if (!email) {
      throw new BadRequestException('Email must be provided');
    }

    const admin = await this.adminService.findByEmail(email);
    if (!admin || !(await bcrypt.compare(password, admin.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { email: admin.email, sub: admin.id, isAdmin: true };

    const jwtSecret = this.configService.get<string>('app.jwtSecret');
    const jwtExpirationTime = this.configService.get<string>('app.jwtExpirationTime');

    const accessToken = this.jwtService.sign(payload, {
      secret: jwtSecret,
      expiresIn: jwtExpirationTime,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: jwtSecret,
      expiresIn: '7d',
    });

    return {
      user: plainToInstance(GetAdminDto, admin),
      accessToken,
      refreshToken,
    };
  }

  @ApiOperation({ summary: 'Exchange refresh token' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid refresh token' })
  @Public()
  @Post('/refresh-token')
  @HttpCode(200)
  async refreshToken(@Body() { refreshToken }: RefreshTokenDto): Promise<{ accessToken: string }> {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const newAccessToken = this.jwtService.sign(
        { email: payload.email, sub: payload.sub },
        { expiresIn: this.configService.get<string>('app.jwtExpirationTime') }
      );

      return {
        accessToken: newAccessToken,
      };
    } catch (e) {
      throw new BadRequestException('Invalid refresh token');
    }
  }

  @ApiOperation({ summary: 'User sign-out' })
  @ApiResponse({ status: 200, description: 'User signed out successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid logout request.' })
  @Public()
  @Post('/sign-out')
  @HttpCode(200)
  async signOut(@Body() { refreshToken }: RefreshTokenDto): Promise<{ description: string, status: number }> {
    try {
      const payload = this.jwtService.verify(refreshToken);
      this.userService.removeLoggedInUser(payload.sub);
      await this.userService.invalidateRefreshToken(refreshToken);
      return { description: 'User signed out successfully', status: 200 };
    } catch (e) {
      throw new BadRequestException('Invalid logout request');
    }
  }


  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get number of logged in users' })
  @ApiResponse({ status: 200, description: 'Number of logged in users' })
  @Post('/logged-in-users-count')
  @HttpCode(200)
  async loggedInUsersCount(): Promise<number> {
    return this.userService.getNumberOfLoggedInUsers();
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all logged in users' })
  @ApiResponse({ status: 200, description: 'List of logged in users' })
  @Post('/logged-in-users')
  @HttpCode(200)
  async getLoggedInUsers(): Promise<GetUserDto[]> {
    return this.userService.getLoggedInUsers();
  }
}