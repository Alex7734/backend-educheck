import { Controller, Get, Post, Body, Delete, Query, Param, UseFilters, UseInterceptors, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiResponse, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ValidationExceptionFilter } from '../common/filters/validation-exception.filter';
import { SerializeInterceptor } from '../common/interceptors/serialize.interceptor';
import { AdminService } from './services/admin.service';
import { CreateAdminDto } from './dto/admin/create-admin.dto';
import { GetAdminDto } from './dto/admin/get-admin.dto';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';

@ApiTags('admin')
@Controller('admin')
@UseFilters(ValidationExceptionFilter)
@UseInterceptors(SerializeInterceptor)
export class AdminController {
    constructor(
        private readonly adminService: AdminService,
        private readonly configService: ConfigService,
    ) { }

    @ApiOperation({ summary: 'Create a new admin user' })
    @ApiResponse({ status: 201, description: 'Admin user created successfully.' })
    @ApiResponse({ status: 400, description: 'Bad request.' })
    @ApiResponse({ status: 403, description: 'Forbidden access.' })
    @ApiQuery({ name: 'secret', required: true, description: 'Secret key for admin access' })
    @Post()
    async createAdmin(
        @Body() createAdminDto: CreateAdminDto,
        @Query('secret') secret: string
    ): Promise<GetAdminDto> {
        this.validateAdminSecret(secret);
        const admin = await this.adminService.createAdmin(createAdminDto);
        return plainToInstance(GetAdminDto, admin);
    }

    @ApiOperation({ summary: 'Retrieve all admin users' })
    @ApiResponse({ status: 200, description: 'Retrieved admin users successfully.' })
    @ApiResponse({ status: 403, description: 'Forbidden access.' })
    @ApiQuery({ name: 'secret', required: true, description: 'Secret key for admin access' })
    @Get()
    async findAll(@Query('secret') secret: string): Promise<GetAdminDto[]> {
        this.validateAdminSecret(secret);
        const admins = await this.adminService.findAllAdmin();
        return admins.map(admin => plainToInstance(GetAdminDto, admin));
    }

    @ApiOperation({ summary: 'Retrieve an admin user by ID' })
    @ApiResponse({ status: 200, description: 'Retrieved admin user by ID.' })
    @ApiResponse({ status: 403, description: 'Forbidden access.' })
    @ApiQuery({ name: 'secret', required: true, description: 'Secret key for admin access' })
    @Get(':id')
    async findOne(
        @Param('id') id: string,
        @Query('secret') secret: string
    ): Promise<GetAdminDto> {
        this.validateAdminSecret(secret);
        const admin = await this.adminService.viewAdmin(id);
        if (!admin) {
            throw new NotFoundException(`Admin with ID ${id} not found`);
        }
        return plainToInstance(GetAdminDto, admin);
    }

    @ApiOperation({ summary: 'Remove an admin user by ID' })
    @ApiResponse({ status: 200, description: 'Admin user removed successfully.' })
    @ApiResponse({ status: 403, description: 'Forbidden access.' })
    @ApiQuery({ name: 'secret', required: true, description: 'Secret key for admin access' })
    @Delete(':id')
    async remove(
        @Param('id') id: string,
        @Query('secret') secret: string
    ): Promise<void> {
        this.validateAdminSecret(secret);
        await this.adminService.removeAdmin(id);
    }

    private validateAdminSecret(secret: string): void {
        const adminSecret = this.configService.get<string>('app.adminSecret');
        if (secret !== adminSecret) {
            throw new ForbiddenException('Invalid secret key');
        }
    }
} 