import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './controllers/auth.controller';
import { UserModule } from '../user/user.module';
import { JwtStrategy } from '../common/jwt/jwt.strategy';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdminService } from '../user/services/admin.service';
import { PasswordResetService } from './services/password-reset.service';
import { PasswordResetController } from './controllers/password-reset.controller';

@Module({
  imports: [
    UserModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const secret = configService.get<string>('app.jwtSecret');
        const expiresIn = configService.get<string>('app.jwtExpirationTime');
        return {
          secret,
          signOptions: { expiresIn },
        };
      },
    }),
  ],
  controllers: [AuthController, PasswordResetController],
  providers: [JwtStrategy, AdminService, PasswordResetService],
  exports: [JwtStrategy, PassportModule],
})
export class AuthModule { }