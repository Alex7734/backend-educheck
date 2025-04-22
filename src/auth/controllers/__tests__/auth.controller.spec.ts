import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../../controllers/auth.controller';
import { UserService } from '../../../user/services/user.service';
import { AdminService } from '../../../user/services/admin.service';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { ConfigService } from '@nestjs/config';

jest.mock('bcryptjs');

describe('AuthController', () => {
    let controller: AuthController;
    let userService: UserService;
    let adminService: AdminService;
    let jwtService: JwtService;

    const mockUserService = {
        findByEmail: jest.fn(),
        createUser: jest.fn(),
        saveRefreshToken: jest.fn(),
        invalidateRefreshToken: jest.fn(),
        addLoggedInUser: jest.fn(),
        removeLoggedInUser: jest.fn(),
        getNumberOfLoggedInUsers: jest.fn(),
        getLoggedInUsers: jest.fn(),
    };

    const mockAdminService = {
        findByEmail: jest.fn(),
    };

    const mockJwtService = {
        sign: jest.fn(),
        verify: jest.fn(),
    };

    const mockConfigService = {
        get: jest.fn((key) => {
            const config = {
                'app.jwtSecret': 'test-jwt-secret',
                'app.jwtExpirationTime': '1h',
            };
            return config[key];
        }),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuthController],
            providers: [
                { provide: UserService, useValue: mockUserService },
                { provide: AdminService, useValue: mockAdminService },
                { provide: JwtService, useValue: mockJwtService },
                { provide: ConfigService, useValue: mockConfigService },
            ],
        }).compile();

        controller = module.get<AuthController>(AuthController);
        userService = module.get<UserService>(UserService);
        adminService = module.get<AdminService>(AdminService);
        jwtService = module.get<JwtService>(JwtService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('createUser', () => {
        const createUserDto = {
            email: 'test@example.com',
            password: 'password123',
            name: 'Test User',
            age: 25,
        };

        it('should create a new user successfully', async () => {
            const userId = uuidv4();
            const newUser = { id: userId, ...createUserDto };
            mockUserService.findByEmail.mockResolvedValue(null);
            mockUserService.createUser.mockResolvedValue(newUser);
            mockJwtService.sign
                .mockReturnValueOnce('access-token')
                .mockReturnValueOnce('refresh-token');

            const result = await controller.createUser(createUserDto);

            expect(result).toEqual({
                user: expect.objectContaining({ id: userId }),
                accessToken: 'access-token',
                refreshToken: 'refresh-token',
            });
            expect(mockUserService.saveRefreshToken).toHaveBeenCalledWith(userId, 'refresh-token');
            expect(mockUserService.addLoggedInUser).toHaveBeenCalledWith(userId);
        });

        it('should throw BadRequestException if user exists', async () => {
            mockUserService.findByEmail.mockResolvedValue({ id: 1 });

            await expect(controller.createUser(createUserDto))
                .rejects
                .toThrow(BadRequestException);
        });
    });

    describe('signin', () => {
        const signInDto = {
            email: 'test@example.com',
            password: 'password123',
        };

        it('should sign in user successfully', async () => {
            const userId = uuidv4();
            const user = { id: userId, ...signInDto, password: 'hashed' };
            mockUserService.findByEmail.mockResolvedValue(user);
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);
            mockJwtService.sign
                .mockReturnValueOnce('access-token')
                .mockReturnValueOnce('refresh-token');

            const result = await controller.signin(signInDto);

            expect(result).toEqual({
                user: expect.objectContaining({ id: userId }),
                accessToken: 'access-token',
                refreshToken: 'refresh-token',
            });
        });

        it('should throw UnauthorizedException for invalid credentials', async () => {
            mockUserService.findByEmail.mockResolvedValue(null);

            await expect(controller.signin(signInDto))
                .rejects
                .toThrow(UnauthorizedException);
        });
    });

    describe('adminSignin', () => {
        const signInDto = {
            email: 'admin@example.com',
            password: 'admin123',
        };

        it('should sign in admin successfully', async () => {
            const adminId = uuidv4();
            const admin = { id: adminId, ...signInDto, password: 'hashed' };
            mockAdminService.findByEmail.mockResolvedValue(admin);
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);
            mockJwtService.sign
                .mockReturnValueOnce('access-token')
                .mockReturnValueOnce('refresh-token');

            const result = await controller.adminSignin(signInDto);

            expect(result).toEqual({
                user: expect.objectContaining({ id: adminId }),
                accessToken: 'access-token',
                refreshToken: 'refresh-token',
            });
        });
    });

    describe('refreshToken', () => {
        it('should refresh token successfully', async () => {
            const payload = { email: 'test@example.com', sub: uuidv4() };
            mockJwtService.verify.mockReturnValue(payload);
            mockJwtService.sign.mockReturnValue('new-access-token');

            const result = await controller.refreshToken({ refreshToken: 'valid-token' });

            expect(result).toEqual({ accessToken: 'new-access-token' });
        });

        it('should throw BadRequestException for invalid refresh token', async () => {
            mockJwtService.verify.mockImplementation(() => {
                throw new Error();
            });

            await expect(controller.refreshToken({ refreshToken: 'invalid-token' }))
                .rejects
                .toThrow(BadRequestException);
        });
    });

    describe('signOut', () => {
        it('should sign out user successfully', async () => {
            const userId = uuidv4();
            mockJwtService.verify.mockReturnValue({ sub: userId });

            const result = await controller.signOut({ refreshToken: 'valid-token' });

            expect(result).toEqual({
                description: 'User signed out successfully',
                status: 200,
            });
            expect(mockUserService.removeLoggedInUser).toHaveBeenCalledWith(userId);
            expect(mockUserService.invalidateRefreshToken).toHaveBeenCalledWith('valid-token');
        });
    });

    describe('loggedInUsersCount', () => {
        it('should return number of logged in users', async () => {
            mockUserService.getNumberOfLoggedInUsers.mockResolvedValue(5);

            const result = await controller.loggedInUsersCount();

            expect(result).toBe(5);
        });
    });

    describe('getLoggedInUsers', () => {
        it('should return list of logged in users', async () => {
            const users = [
                { id: uuidv4(), email: 'user1@example.com' },
                { id: uuidv4(), email: 'user2@example.com' },
            ];
            mockUserService.getLoggedInUsers.mockResolvedValue(users);

            const result = await controller.getLoggedInUsers();

            expect(result).toEqual(users);
        });
    });
});