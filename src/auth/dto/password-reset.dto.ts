import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RequestPasswordResetDto {
    @ApiProperty({
        description: 'Email address of the user requesting password reset',
        example: 'user@example.com',
    })
    @IsEmail()
    email: string;
}

export class ResetPasswordDto {
    @ApiProperty({
        description: 'Reset token received in the email',
        example: 'a1b2c3d4e5f6g7h8i9j0',
    })
    @IsString()
    token: string;

    @ApiProperty({
        description: 'New password for the account',
        example: 'newSecurePassword123',
        minLength: 8,
    })
    @IsString()
    @MinLength(8)
    newPassword: string;
} 