import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsString } from 'class-validator';

export class CreateCourseDto {
  @ApiProperty({ description: 'The title of the course' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'The description of the course' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Whether the course is active or not', default: true })
  @IsBoolean()
  isActive: boolean;
}