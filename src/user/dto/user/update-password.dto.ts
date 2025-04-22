import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength, MaxLength, Matches } from 'class-validator';

export class UpdatePasswordDto {
    @ApiProperty({
        description: 'The new password',
        minLength: 6,
        maxLength: 32,
        example: 'StrongPass123'
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    @MaxLength(32)
    @Matches(/^(?=.*[A-Z])(?=.*[0-9])[A-Za-z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{6,32}$/, {
        message: 'Password must contain at least one uppercase letter and one number.',
    })
    newPassword: string;
} 