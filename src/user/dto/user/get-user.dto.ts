import { OmitType, ApiProperty } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { Exclude, Expose } from 'class-transformer';

export class GetUserDto extends OmitType(CreateUserDto, ['password'] as const) {
  @ApiProperty({ description: 'The unique identifier of the user' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'The name of the user' })
  @Expose()
  name: string;

  @ApiProperty({ description: 'The email of the user' })
  @Expose()
  email: string;

  @ApiProperty({ description: 'The age of the user', required: false, type: Number })
  @Expose()
  age?: number | null;

  @ApiProperty({ description: 'The password of the user' })
  @Exclude()
  password: string;

  @ApiProperty({ description: 'Number of courses the user is enrolled in' })
  @Expose()
  numberOfEnrolledCourses: number;
}