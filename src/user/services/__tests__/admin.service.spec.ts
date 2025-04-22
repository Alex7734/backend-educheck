import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from '../admin.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Admin } from '../../entities/admin.entity';
import { Repository } from 'typeorm';
import { CreateAdminDto } from '../../dto/admin/create-admin.dto';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs', () => ({
    hash: jest.fn().mockResolvedValue('hashedPassword'),
}));

jest.mock('uuid', () => ({
    v4: jest.fn().mockReturnValue('mocked-uuid'),
}));

describe('AdminService', () => {
    let service: AdminService;
    let adminRepository: Repository<Admin>;

    const mockAdminRepository = {
        create: jest.fn(),
        save: jest.fn(),
        find: jest.fn(),
        findOneBy: jest.fn(),
        delete: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AdminService,
                {
                    provide: getRepositoryToken(Admin),
                    useValue: mockAdminRepository,
                },
            ],
        }).compile();

        service = module.get<AdminService>(AdminService);
        adminRepository = module.get<Repository<Admin>>(getRepositoryToken(Admin));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createAdmin', () => {
        const createAdminDto: CreateAdminDto = {
            name: 'Admin User',
            email: 'admin@example.com',
            password: 'adminpass',
            age: 30,
            hasWeb3Access: true,
        };

        it('should create a new admin successfully', async () => {
            const expectedAdmin = {
                id: 'mocked-uuid',
                ...createAdminDto,
                password: 'hashedPassword',
            };

            mockAdminRepository.findOneBy.mockResolvedValue(null);
            mockAdminRepository.create.mockReturnValue(expectedAdmin);
            mockAdminRepository.save.mockResolvedValue(expectedAdmin);

            const result = await service.createAdmin(createAdminDto);

            expect(result).toEqual(expectedAdmin);
            expect(bcrypt.hash).toHaveBeenCalledWith(createAdminDto.password, 10);
            expect(mockAdminRepository.create).toHaveBeenCalledWith({
                ...createAdminDto,
                password: 'hashedPassword',
                id: 'mocked-uuid',
            });
            expect(mockAdminRepository.save).toHaveBeenCalledWith(expectedAdmin);
        });

        it('should throw BadRequestException if admin with email already exists', async () => {
            mockAdminRepository.findOneBy.mockResolvedValue({ id: 'existing-id' });

            await expect(service.createAdmin(createAdminDto))
                .rejects
                .toThrow(BadRequestException);

            expect(mockAdminRepository.create).not.toHaveBeenCalled();
            expect(mockAdminRepository.save).not.toHaveBeenCalled();
        });
    });

    describe('findAllAdmin', () => {
        it('should return all admins', async () => {
            const expectedAdmins = [
                { id: '1', name: 'Admin 1' },
                { id: '2', name: 'Admin 2' },
            ];
            mockAdminRepository.find.mockResolvedValue(expectedAdmins);

            const result = await service.findAllAdmin();

            expect(result).toEqual(expectedAdmins);
            expect(mockAdminRepository.find).toHaveBeenCalled();
        });

        it('should return empty array when no admins exist', async () => {
            mockAdminRepository.find.mockResolvedValue([]);

            const result = await service.findAllAdmin();

            expect(result).toEqual([]);
            expect(mockAdminRepository.find).toHaveBeenCalled();
        });
    });

    describe('viewAdmin', () => {
        const adminId = 'test-id';

        it('should return admin when found', async () => {
            const expectedAdmin = { id: adminId, name: 'Admin User' };
            mockAdminRepository.findOneBy.mockResolvedValue(expectedAdmin);

            const result = await service.viewAdmin(adminId);

            expect(result).toEqual(expectedAdmin);
            expect(mockAdminRepository.findOneBy).toHaveBeenCalledWith({ id: adminId.toString() });
        });

        it('should return null when admin not found', async () => {
            mockAdminRepository.findOneBy.mockResolvedValue(null);

            const result = await service.viewAdmin(adminId);

            expect(result).toBeNull();
            expect(mockAdminRepository.findOneBy).toHaveBeenCalledWith({ id: adminId.toString() });
        });
    });

    describe('removeAdmin', () => {
        const adminId = 'test-id';

        it('should remove admin successfully', async () => {
            const admin = { id: adminId, name: 'Admin User' };
            mockAdminRepository.findOneBy.mockResolvedValue(admin);
            mockAdminRepository.delete.mockResolvedValue({ affected: 1 });

            await service.removeAdmin(adminId);

            expect(mockAdminRepository.findOneBy).toHaveBeenCalledWith({ id: adminId.toString() });
            expect(mockAdminRepository.delete).toHaveBeenCalledWith(adminId);
        });

        it('should throw NotFoundException when admin not found', async () => {
            mockAdminRepository.findOneBy.mockResolvedValue(null);

            await expect(service.removeAdmin(adminId))
                .rejects
                .toThrow(NotFoundException);

            expect(mockAdminRepository.findOneBy).toHaveBeenCalledWith({ id: adminId.toString() });
            expect(mockAdminRepository.delete).not.toHaveBeenCalled();
        });
    });

    describe('findByEmail', () => {
        const email = 'admin@example.com';

        it('should return admin when found by email', async () => {
            const expectedAdmin = { id: '1', email, name: 'Admin User' };
            mockAdminRepository.findOneBy.mockResolvedValue(expectedAdmin);

            const result = await service.findByEmail(email);

            expect(result).toEqual(expectedAdmin);
            expect(mockAdminRepository.findOneBy).toHaveBeenCalledWith({ email });
        });

        it('should return null when admin not found by email', async () => {
            mockAdminRepository.findOneBy.mockResolvedValue(null);

            const result = await service.findByEmail(email);

            expect(result).toBeNull();
            expect(mockAdminRepository.findOneBy).toHaveBeenCalledWith({ email });
        });
    });
});