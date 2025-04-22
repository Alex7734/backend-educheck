import { IsNotEmpty, IsBoolean } from 'class-validator';
import { CreateUserDto } from '../user/create-user.dto';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAdminDto extends CreateUserDto {
  @ApiProperty({ description: 'Indicates if the admin has Web3 access' })
  @IsBoolean()
  @IsNotEmpty()
  readonly hasWeb3Access: boolean;
}