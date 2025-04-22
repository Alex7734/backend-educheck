import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../../user/services/user.service';
import * as nodemailer from 'nodemailer';
import * as crypto from 'crypto';
import { UpdatePasswordDto } from '../../user/dto/user/update-password.dto';
import { RESET_PASSWORD_EMAIL_TEMPLATE } from '../../common/email-templates/reset-password';
import { EmailConfig, ResetToken } from 'src/common/types/password-reset';

@Injectable()
export class PasswordResetService {
    private readonly transporter: nodemailer.Transporter | null;

    constructor(
        private readonly configService: ConfigService,
        private readonly userService: UserService,
    ) {
        this.transporter = this.createTransporter();
    }

    private createTransporter = (): nodemailer.Transporter | null => {
        const gmailUser = this.configService.get<string>('app.gmailUser');
        const gmailPassword = this.configService.get<string>('app.gmailPassword');

        if (!gmailUser || !gmailPassword) {
            return null;
        }

        return nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: gmailUser,
                pass: gmailPassword,
            },
        });
    };

    private generateToken = (): ResetToken => ({
        token: crypto.randomBytes(32).toString('hex'),
        expires: new Date(Date.now() + 3600000),
    });

    private createEmailConfig = (email: string, token: string): EmailConfig => {
        const gmailUser = this.configService.get<string>('app.gmailUser') || 'no-reply@example.com';
        const frontendUrl = this.configService.get<string>('app.frontendUrl') || 'http://localhost:3000';

        return {
            from: gmailUser,
            to: email,
            subject: 'Password Reset Request',
            html: RESET_PASSWORD_EMAIL_TEMPLATE(`${frontendUrl}/reset-password?token=${token}`),
        };
    };

    private handleError = (error: unknown): never => {
        if (error instanceof HttpException) {
            throw error;
        }
        throw new HttpException('Failed to update password', HttpStatus.INTERNAL_SERVER_ERROR);
    };

    generateResetToken = async (email: string): Promise<string> => {
        const user = await this.userService.findByEmail(email);
        if (!user) {
            throw new Error('User not found');
        }

        const { token, expires } = this.generateToken();
        await this.userService.saveResetToken(user.id.toString(), token, expires);
        return token;
    };

    sendResetEmail = async (email: string, token: string): Promise<void> => {
        if (!this.transporter) {
            console.warn('Email transporter not configured. Skipping email send.');
            return;
        }

        const mailOptions = this.createEmailConfig(email, token);
        await this.transporter.sendMail(mailOptions);
    };

    resetPassword = async (token: string, newPassword: string): Promise<void> => {
        const user = await this.userService.findByResetToken(token);
        if (!user) {
            throw new HttpException('Invalid or expired reset token', HttpStatus.BAD_REQUEST);
        }

        const updatePasswordDto = new UpdatePasswordDto();
        updatePasswordDto.newPassword = newPassword;

        try {
            await this.userService.updatePassword(user.id.toString(), updatePasswordDto);
            await this.userService.invalidateResetToken(token);
        } catch (error) {
            this.handleError(error);
        }
    };
} 