import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from '../admin.controller';
import { AdminService } from '../services/admin.service';
import { ConfigService } from '@nestjs/config';
import { CreateAdminDto } from '../dto/admin/create-admin.dto';
import { GetAdminDto } from '../dto/admin/get-admin.dto';
import { plainToInstance } from 'class-transformer';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('AdminController', () => {
    let controller: AdminController;
    let adminService: AdminService;
    let configService: ConfigService;

    const mockAdminService = {
        createAdmin: jest.fn(),
        findAllAdmin: jest.fn(),
        viewAdmin: jest.fn(),
        removeAdmin: jest.fn(),
    };

    const mockConfigService = {
        get: jest.fn().mockReturnValue('test-admin-secret'),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AdminController],
            providers: [
                { provide: AdminService, useValue: mockAdminService },
                { provide: ConfigService, useValue: mockConfigService },
            ],
        }).compile();

        controller = module.get<AdminController>(AdminController);
        adminService = module.get<AdminService>(AdminService);
        configService = module.get<ConfigService>(ConfigService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('createAdmin', () => {
        const createAdminDto: CreateAdminDto = {
            name: 'Admin User',
            email: 'admin@example.com',
            password: 'adminpass',
            age: 30,
            hasWeb3Access: true,
        };

        const mockAdmin = {
            id: '123e4567-e89b-12d3-a456-426614174000',
            ...createAdminDto,
        };

        it('should create an admin when valid secret is provided', async () => {
            mockAdminService.createAdmin.mockResolvedValue(mockAdmin);

            const result = await controller.createAdmin(createAdminDto, 'test-admin-secret');

            expect(result).toEqual(plainToInstance(GetAdminDto, mockAdmin));
            expect(mockAdminService.createAdmin).toHaveBeenCalledWith(createAdminDto);
            expect(mockConfigService.get).toHaveBeenCalledWith('app.adminSecret');
        });

        it('should throw ForbiddenException when invalid secret is provided', async () => {
            await expect(
                controller.createAdmin(createAdminDto, 'wrong-secret')
            ).rejects.toThrow(ForbiddenException);

            expect(mockAdminService.createAdmin).not.toHaveBeenCalled();
        });
    });

    describe('findAll', () => {
        const mockAdmins = [
            {
                id: '123e4567-e89b-12d3-a456-426614174000',
                name: 'Admin 1',
                email: 'admin1@example.com',
                age: 30,
                hasWeb3Access: true,
            },
            {
                id: '123e4567-e89b-12d3-a456-426614174001',
                name: 'Admin 2',
                email: 'admin2@example.com',
                age: 35,
                hasWeb3Access: false,
            },
        ];

        it('should return all admins when valid secret is provided', async () => {
            mockAdminService.findAllAdmin.mockResolvedValue(mockAdmins);

            const result = await controller.findAll('test-admin-secret');

            expect(result).toEqual(mockAdmins.map(admin => plainToInstance(GetAdminDto, admin)));
            expect(mockAdminService.findAllAdmin).toHaveBeenCalled();
        });

        it('should throw ForbiddenException when invalid secret is provided', async () => {
            await expect(controller.findAll('wrong-secret')).rejects.toThrow(ForbiddenException);
            expect(mockAdminService.findAllAdmin).not.toHaveBeenCalled();
        });
    });

    describe('findOne', () => {
        const mockAdmin = {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: 'Admin User',
            email: 'admin@example.com',
            age: 30,
            hasWeb3Access: true,
        };

        it('should return an admin when valid secret and existing ID are provided', async () => {
            mockAdminService.viewAdmin.mockResolvedValue(mockAdmin);

            const result = await controller.findOne(mockAdmin.id, 'test-admin-secret');

            expect(result).toEqual(plainToInstance(GetAdminDto, mockAdmin));
            expect(mockAdminService.viewAdmin).toHaveBeenCalledWith(mockAdmin.id);
        });

        it('should throw ForbiddenException when invalid secret is provided', async () => {
            await expect(
                controller.findOne(mockAdmin.id, 'wrong-secret')
            ).rejects.toThrow(ForbiddenException);

            expect(mockAdminService.viewAdmin).not.toHaveBeenCalled();
        });

        it('should throw NotFoundException when admin is not found', async () => {
            mockAdminService.viewAdmin.mockResolvedValue(null);

            await expect(
                controller.findOne('non-existent-id', 'test-admin-secret')
            ).rejects.toThrow(NotFoundException);

            expect(mockAdminService.viewAdmin).toHaveBeenCalledWith('non-existent-id');
        });
    });

    describe('remove', () => {
        const adminId = '123e4567-e89b-12d3-a456-426614174000';

        it('should remove an admin when valid secret is provided', async () => {
            mockAdminService.removeAdmin.mockResolvedValue(undefined);

            await controller.remove(adminId, 'test-admin-secret');

            expect(mockAdminService.removeAdmin).toHaveBeenCalledWith(adminId);
        });

        it('should throw ForbiddenException when invalid secret is provided', async () => {
            await expect(
                controller.remove(adminId, 'wrong-secret')
            ).rejects.toThrow(ForbiddenException);

            expect(mockAdminService.removeAdmin).not.toHaveBeenCalled();
        });

        it('should handle removeAdmin throwing NotFoundException', async () => {
            mockAdminService.removeAdmin.mockRejectedValue(new NotFoundException());

            await expect(
                controller.remove(adminId, 'test-admin-secret')
            ).rejects.toThrow(NotFoundException);

            expect(mockAdminService.removeAdmin).toHaveBeenCalledWith(adminId);
        });
    });

    describe('validateAdminSecret', () => {
        it('should not throw when valid secret is provided', () => {
            expect(() => {
                (controller as any).validateAdminSecret('test-admin-secret');
            }).not.toThrow();
        });

        it('should throw ForbiddenException when invalid secret is provided', () => {
            expect(() => {
                (controller as any).validateAdminSecret('wrong-secret');
            }).toThrow(ForbiddenException);
        });

        it('should throw ForbiddenException when no secret is provided', () => {
            expect(() => {
                (controller as any).validateAdminSecret(undefined);
            }).toThrow(ForbiddenException);
        });
    });
});