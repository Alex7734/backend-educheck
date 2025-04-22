import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class GetCourseDto {
  @ApiProperty({ description: 'The unique identifier of the course' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'The title of the course' })
  @Expose()
  title: string;

  @ApiProperty({ description: 'The description of the course' })
  @Expose()
  description: string;

  @ApiProperty({ description: 'Whether the course is active or not', type: Boolean })
  @Expose()
  isActive: boolean;

  @ApiProperty({ description: 'Number of students enrolled in the course' })
  @Expose()
  numberOfStudents: number;
}