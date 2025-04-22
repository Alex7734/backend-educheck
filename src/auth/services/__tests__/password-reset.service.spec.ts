import { Test, TestingModule } from '@nestjs/testing';
import { PasswordResetService } from '../password-reset.service';
import { UserService } from '../../../user/services/user.service';
import { ConfigService } from '@nestjs/config';
import { HttpException, HttpStatus } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { UpdatePasswordDto } from '../../../user/dto/user/update-password.dto';

jest.mock('nodemailer', () => ({
    createTransport: jest.fn().mockReturnValue({
        sendMail: jest.fn(),
    }),
}));

describe('PasswordResetService', () => {
    let service: PasswordResetService;
    let userService: UserService;
    let configService: ConfigService;
    let sendMailSpy: jest.SpyInstance;

    const mockUserService = {
        findByEmail: jest.fn(),
        saveResetToken: jest.fn(),
        findByResetToken: jest.fn(),
        updatePassword: jest.fn(),
        invalidateResetToken: jest.fn(),
    };

    const mockConfigService = {
        get: jest.fn((key) => {
            const config = {
                'app.gmailUser': 'test@gmail.com',
                'app.gmailPassword': 'test-password',
                'app.frontendUrl': 'http://localhost:3000',
            };
            return config[key];
        }),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PasswordResetService,
                {
                    provide: UserService,
                    useValue: mockUserService,
                },
                {
                    provide: ConfigService,
                    useValue: mockConfigService,
                },
            ],
        }).compile();

        service = module.get<PasswordResetService>(PasswordResetService);
        userService = module.get<UserService>(UserService);
        configService = module.get<ConfigService>(ConfigService);

        const transporter = nodemailer.createTransport();
        sendMailSpy = jest.spyOn(transporter, 'sendMail');
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('generateResetToken', () => {
        it('should generate and save reset token for existing user', async () => {
            const email = 'test@example.com';
            const user = { id: '1', email };
            mockUserService.findByEmail.mockResolvedValue(user);
            mockUserService.saveResetToken.mockResolvedValue(undefined);

            const token = await service.generateResetToken(email);

            expect(token).toBeDefined();
            expect(token).toHaveLength(64); // 32 bytes in hex
            expect(mockUserService.findByEmail).toHaveBeenCalledWith(email);
            expect(mockUserService.saveResetToken).toHaveBeenCalledWith(
                user.id.toString(),
                expect.any(String),
                expect.any(Date),
            );
        });

        it('should throw error for non-existent user', async () => {
            const email = 'nonexistent@example.com';
            mockUserService.findByEmail.mockResolvedValue(null);

            await expect(service.generateResetToken(email)).rejects.toThrow('User not found');
        });
    });

    describe('sendResetEmail', () => {
        it('should send reset email successfully', async () => {
            const email = 'test@example.com';
            const token = 'test-token';
            sendMailSpy.mockResolvedValue({});

            await service.sendResetEmail(email, token);

            expect(sendMailSpy).toHaveBeenCalledWith({
                from: 'test@gmail.com',
                to: email,
                subject: 'Password Reset Request',
                html: expect.any(String),
            });
        });

        it('should handle email sending errors', async () => {
            const email = 'test@example.com';
            const token = 'test-token';
            const error = new Error('Email sending failed');
            sendMailSpy.mockRejectedValue(error);

            await expect(service.sendResetEmail(email, token)).rejects.toThrow(error);
        });
    });

    describe('resetPassword', () => {
        const token = 'valid-token';
        const newPassword = 'NewPassword123!';
        const user = { id: '1' };

        it('should reset password successfully', async () => {
            mockUserService.findByResetToken.mockResolvedValue(user);
            mockUserService.updatePassword.mockResolvedValue(undefined);
            mockUserService.invalidateResetToken.mockResolvedValue(undefined);

            await service.resetPassword(token, newPassword);

            expect(mockUserService.findByResetToken).toHaveBeenCalledWith(token);
            expect(mockUserService.updatePassword).toHaveBeenCalledWith(
                user.id.toString(),
                expect.any(UpdatePasswordDto),
            );
            expect(mockUserService.invalidateResetToken).toHaveBeenCalledWith(token);
        });

        it('should throw BadRequestException for invalid token', async () => {
            mockUserService.findByResetToken.mockResolvedValue(null);

            await expect(service.resetPassword(token, newPassword)).rejects.toThrow(
                new HttpException('Invalid or expired reset token', HttpStatus.BAD_REQUEST),
            );
        });

        it('should handle password update errors', async () => {
            mockUserService.findByResetToken.mockResolvedValue(user);
            const error = new HttpException('Invalid password format', HttpStatus.UNPROCESSABLE_ENTITY);
            mockUserService.updatePassword.mockRejectedValue(error);

            await expect(service.resetPassword(token, newPassword)).rejects.toThrow(error);
        });

        it('should handle unexpected errors', async () => {
            mockUserService.findByResetToken.mockResolvedValue(user);
            const error = new Error('Unexpected error');
            mockUserService.updatePassword.mockRejectedValue(error);

            await expect(service.resetPassword(token, newPassword)).rejects.toThrow(
                new HttpException('Failed to update password', HttpStatus.INTERNAL_SERVER_ERROR),
            );
        });
    });
}); 