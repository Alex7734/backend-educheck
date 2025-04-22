import { Test, TestingModule } from '@nestjs/testing';
import { PasswordResetController } from '../../controllers/password-reset.controller';
import { PasswordResetService } from '../../services/password-reset.service';
import { BadRequestException, HttpException } from '@nestjs/common';
import { RequestPasswordResetDto, ResetPasswordDto } from '../../dto/password-reset.dto';

describe('PasswordResetController', () => {
    let controller: PasswordResetController;
    let passwordResetService: PasswordResetService;

    const mockPasswordResetService = {
        generateResetToken: jest.fn(),
        sendResetEmail: jest.fn(),
        resetPassword: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [PasswordResetController],
            providers: [
                {
                    provide: PasswordResetService,
                    useValue: mockPasswordResetService,
                },
            ],
        }).compile();

        controller = module.get<PasswordResetController>(PasswordResetController);
        passwordResetService = module.get<PasswordResetService>(PasswordResetService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('requestReset', () => {
        const requestPasswordResetDto: RequestPasswordResetDto = {
            email: 'test@example.com',
        };

        it('should send reset email successfully', async () => {
            const token = 'reset-token';
            mockPasswordResetService.generateResetToken.mockResolvedValue(token);
            mockPasswordResetService.sendResetEmail.mockResolvedValue(undefined);

            const result = await controller.requestReset(requestPasswordResetDto);

            expect(result).toEqual({
                message: 'If an account exists with this email, a password reset link has been sent',
            });
            expect(mockPasswordResetService.generateResetToken).toHaveBeenCalledWith(
                requestPasswordResetDto.email,
            );
            expect(mockPasswordResetService.sendResetEmail).toHaveBeenCalledWith(
                requestPasswordResetDto.email,
                token,
            );
        });

        it('should handle errors gracefully', async () => {
            mockPasswordResetService.generateResetToken.mockRejectedValue(
                new Error('Some error'),
            );

            const result = await controller.requestReset(requestPasswordResetDto);

            expect(result).toEqual({
                message: 'If an account exists with this email, a password reset link has been sent',
            });
        });
    });

    describe('resetPassword', () => {
        const resetPasswordDto: ResetPasswordDto = {
            token: 'valid-token',
            newPassword: 'NewPassword123!',
        };

        it('should reset password successfully', async () => {
            mockPasswordResetService.resetPassword.mockResolvedValue(undefined);

            const result = await controller.resetPassword(resetPasswordDto);

            expect(result).toEqual({
                message: 'Password reset successfully',
            });
            expect(mockPasswordResetService.resetPassword).toHaveBeenCalledWith(
                resetPasswordDto.token,
                resetPasswordDto.newPassword,
            );
        });

        it('should throw BadRequestException for invalid token', async () => {
            mockPasswordResetService.resetPassword.mockRejectedValue(
                new BadRequestException('Invalid or expired reset token'),
            );

            await expect(controller.resetPassword(resetPasswordDto)).rejects.toThrow(
                BadRequestException,
            );
        });

        it('should throw HttpException for unexpected errors', async () => {
            mockPasswordResetService.resetPassword.mockRejectedValue(
                new Error('Unexpected error'),
            );

            await expect(controller.resetPassword(resetPasswordDto)).rejects.toThrow(
                HttpException,
            );
        });
    });
});
