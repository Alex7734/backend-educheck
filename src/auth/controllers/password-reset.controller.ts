import { Body, Controller, Post, HttpCode, HttpException, HttpStatus } from '@nestjs/common';
import { PasswordResetService } from '../services/password-reset.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { RequestPasswordResetDto, ResetPasswordDto } from '../dto/password-reset.dto';

@ApiTags('auth')
@Controller('auth/password-reset')
export class PasswordResetController {
    constructor(private readonly passwordResetService: PasswordResetService) { }

    @Post('request')
    @HttpCode(200)
    @ApiOperation({ summary: 'Request password reset' })
    @ApiBody({ type: RequestPasswordResetDto })
    @ApiResponse({
        status: 200,
        description: 'Reset email sent successfully',
        schema: {
            type: 'object',
            properties: {
                message: {
                    type: 'string',
                    example: 'If an account exists with this email, a password reset link has been sent'
                }
            }
        }
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid email format',
        schema: {
            type: 'object',
            properties: {
                message: {
                    type: 'string',
                    example: 'Invalid email format'
                }
            }
        }
    })
    async requestReset(@Body() requestPasswordResetDto: RequestPasswordResetDto): Promise<{ message: string }> {
        try {
            const token = await this.passwordResetService.generateResetToken(requestPasswordResetDto.email);
            await this.passwordResetService.sendResetEmail(requestPasswordResetDto.email, token);
            return { message: 'If an account exists with this email, a password reset link has been sent' };
        } catch (error) {
            return { message: 'If an account exists with this email, a password reset link has been sent' };
        }
    }

    @Post('reset')
    @HttpCode(200)
    @ApiOperation({ summary: 'Reset password with token' })
    @ApiBody({ type: ResetPasswordDto })
    @ApiResponse({
        status: 200,
        description: 'Password reset successfully',
        schema: {
            type: 'object',
            properties: {
                message: {
                    type: 'string',
                    example: 'Password reset successfully'
                }
            }
        }
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid or expired token',
        schema: {
            type: 'object',
            properties: {
                message: {
                    type: 'string',
                    example: 'Invalid or expired reset token'
                }
            }
        }
    })
    @ApiResponse({
        status: 422,
        description: 'Invalid password format',
        schema: {
            type: 'object',
            properties: {
                message: {
                    type: 'string',
                    example: 'Invalid password format'
                }
            }
        }
    })
    async resetPassword(@Body() resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
        try {
            await this.passwordResetService.resetPassword(resetPasswordDto.token, resetPasswordDto.newPassword);
            return { message: 'Password reset successfully' };
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            throw new HttpException('An unexpected error occurred', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
} 