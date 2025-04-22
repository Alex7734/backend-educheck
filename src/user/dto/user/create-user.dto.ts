import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsString,
  IsOptional,
  IsNumber,
  MinLength,
  MaxLength,
  Min,
  Max,
  Matches,
  IsNotEmpty
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    description: 'The name of the user',
    minLength: 2,
    maxLength: 50,
    example: 'John Doe'
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-zA-Z\s]*$/, { message: 'Name can only contain letters and spaces' })
  name: string;

  @ApiProperty({
    description: 'The email of the user',
    example: 'john.doe@example.com'
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty()
  @MaxLength(100)
  email: string;

  @ApiProperty({
    description: 'The password of the user',
    minLength: 8,
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
  password: string;

  @ApiProperty({
    description: 'The age of the user',
    required: false,
    type: Number,
    minimum: 13,
    maximum: 120,
    example: 25
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(13, { message: 'User must be at least 13 years old' })
  @Max(120, { message: 'Please provide a valid age' })
  age?: number | null;
}