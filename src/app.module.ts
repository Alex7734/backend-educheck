import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './user/user.module';
import { User } from './user/entities/user.entity';
import { Admin } from './user/entities/admin.entity';
import { RefreshToken } from './user/entities/refresh-token.entity';
import { AuthModule } from './auth/auth.module';
import { CourseModule } from './course/course.module';
import { Course } from './course/entities/course.entity';
import { EnrollmentModule } from './enrollment/enrollment.module';
import { Enrollment } from './enrollment/entities/enrollment.entity';
import { AssignmentModule } from './assignment/assignment.module';
import { QuestionModule } from './question/question.module';

import appConfig from './config/appConfig';
import swagger from './config/swagger';
import database from './config/database';
import { Assignment } from './assignment/entities/assignment.entity';
import { Question } from './question/entities/question.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, swagger, database],
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '5432', 10),
      username: process.env.DATABASE_USERNAME || 'admin',
      password: process.env.DATABASE_PASSWORD || 'changeit',
      database: process.env.DATABASE_NAME || 'pg4django',
      entities: [User, Admin, RefreshToken, Course, Enrollment, Assignment, Question],
      synchronize: true,
      logging: (process.env.DATABASE_LOGGING === 'true'),
    }),
    UserModule,
    AuthModule,
    CourseModule,
    EnrollmentModule,
    AssignmentModule,
    QuestionModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
