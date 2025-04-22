import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseFilters,
  Query,
  NotFoundException,
  BadRequestException,
  UseInterceptors,
} from '@nestjs/common';
import { UserService } from './services/user.service';
import { CreateUserDto } from './dto/user/create-user.dto';
import { UpdateUserDto } from './dto/user/update-user.dto';
import { ApiTags, ApiResponse, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ValidationExceptionFilter } from '../common/filters/validation-exception.filter';
import { AdminService } from './services/admin.service';
import { GetUserDto } from './dto/user/get-user.dto';
import { UserType } from '../common/types/users';
import { GetAdminDto } from './dto/admin/get-admin.dto';
import { plainToInstance } from 'class-transformer';
import { SerializeInterceptor } from '../common/interceptors/serialize.interceptor';
import { User } from './entities/user.entity';
import { UpdatePasswordDto } from './dto/user/update-password.dto';

@ApiTags('users')
@Controller('user')
@UseFilters(ValidationExceptionFilter)
@UseInterceptors(SerializeInterceptor)
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly adminService: AdminService,
  ) { }

  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 409, description: 'User with provided email already exists.' })
  @Post()
  async create(@Body() createUserDto: CreateUserDto): Promise<GetUserDto> {
    const user = await this.userService.createUser(createUserDto);
    return plainToInstance(GetUserDto, user);
  }

  @ApiOperation({
    summary:
      'Retrieve users by type: "users" for regular users, "admin" for admin users, omit for all users.',
  })
  @ApiResponse({ status: 200, description: 'Retrieved users successfully.' })
  @ApiResponse({ status: 400, description: 'Bad request, wrong type' })
  @ApiQuery({ name: 'type', enum: UserType, required: false, description: 'Type of users to retrieve' })
  @Get()
  async findAll(@Query('type') type?: UserType | null): Promise<(GetUserDto | GetAdminDto)[]> {
    if (type === UserType.USERS) {
      const users = await this.userService.findAllUser();
      return users.map(user => plainToInstance(GetUserDto, user));
    } else if (type === UserType.ADMINS) {
      const admins = await this.adminService.findAllAdmin();
      return admins.map(admin => plainToInstance(GetAdminDto, admin));
    }

    if (type) {
      throw new BadRequestException('Invalid user type');
    }

    const users = await this.userService.findAllUser();
    const admins = await this.adminService.findAllAdmin();

    return [...users.map(user => plainToInstance(GetUserDto, user)), ...admins.map(admin => plainToInstance(GetAdminDto, admin))];
  }

  @ApiOperation({ summary: 'Retrieve a user by ID (admins are not accessible).' })
  @ApiResponse({ status: 200, description: 'Retrieved user by ID.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<GetUserDto | GetAdminDto> {
    let foundUser: GetUserDto | GetAdminDto | null = null;

    try {
      foundUser = await this.userService.viewUser(id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        foundUser = await this.adminService.viewAdmin(id);
        if (Array.isArray(foundUser)) {
          foundUser = foundUser[0];
        }
      }
    }

    if (!foundUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (foundUser instanceof User) {
      return plainToInstance(GetUserDto, foundUser);
    }

    return plainToInstance(GetAdminDto, foundUser);
  }

  @ApiOperation({ summary: 'Update a user by ID' })
  @ApiResponse({ status: 200, description: 'User updated successfully.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto): Promise<GetUserDto> {
    const updatedUser = await this.userService.updateUser(id, updateUserDto);
    if (!updatedUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return plainToInstance(GetUserDto, updatedUser);
  }

  @ApiOperation({ summary: 'Remove a user by ID' })
  @ApiResponse({ status: 200, description: 'User removed successfully.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  @Delete(':id')
  async remove(@Param('id') id: string) {
    const user = await this.userService.viewUser(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    await this.userService.removeUser(id);
  }

  @ApiOperation({ summary: 'Update user password' })
  @ApiResponse({ status: 200, description: 'Password updated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid password format.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  @Patch(':id/password')
  async updatePassword(
    @Param('id') id: string,
    @Body() updatePasswordDto: UpdatePasswordDto,
  ): Promise<void> {
    await this.userService.updatePassword(id, updatePasswordDto);
  }
}