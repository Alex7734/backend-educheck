import { OmitType } from '@nestjs/swagger';
import { CreateAdminDto } from './create-admin.dto';
import { Expose } from 'class-transformer';

export class GetAdminDto extends OmitType(CreateAdminDto, ['password'] as const) {
  @Expose()
  id: string;

  @Expose()
  email: string;

  @Expose()
  name: string;

  @Expose()
  age: number | null;

  @Expose()
  hasWeb3Access: boolean;
}
