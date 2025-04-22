import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { GetUserDto } from '../../user/dto/user/get-user.dto';
import { GetCourseDto } from '../../course/dto/get-course.dto';

export class GetEnrollmentDto {
    @ApiProperty({ description: 'The unique identifier of the enrollment' })
    @Expose()
    id: string;

    @ApiProperty({ description: 'The enrolled user' })
    @Expose()
    @Type(() => GetUserDto)
    user: GetUserDto;

    @ApiProperty({ description: 'The course enrolled in' })
    @Expose()
    @Type(() => GetCourseDto)
    course: GetCourseDto;

    @ApiProperty({ description: 'The date of enrollment' })
    @Expose()
    enrollmentDate: Date;

    @ApiProperty({ description: 'Whether the enrollment is completed' })
    @Expose()
    completed: boolean;

    @ApiProperty({ description: 'Whether the test is passed' })
    @Expose()
    testPassed: boolean;

    @ApiProperty({ description: 'The date of the last attempt' })
    @Expose()
    dateLastAttempt: Date;
} 