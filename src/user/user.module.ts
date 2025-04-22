import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './user.controller';
import { AdminController } from './admin.controller';
import { UserService } from './services/user.service';
import { AdminService } from './services/admin.service';
import { User } from './entities/user.entity';
import { Admin } from './entities/admin.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [TypeOrmModule.forFeature([User, Admin, RefreshToken])],
  controllers: [UserController, AdminController],
  providers: [UserService, AdminService, ConfigService],
  exports: [UserService, TypeOrmModule, AdminService],
})
export class UserModule { }