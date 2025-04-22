import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['password', 'email'] as const)
) {
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
  name?: string;

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