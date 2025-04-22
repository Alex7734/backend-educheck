import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Assignment } from './entities/assignment.entity';
import { AssignmentService } from './assignment.service';
import { AssignmentController } from './assignment.controller';
import { QuestionModule } from '../question/question.module';
import { Question } from '../question/entities/question.entity';
import { CourseModule } from '../course/course.module';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
    imports: [TypeOrmModule.forFeature([Assignment, Question]), QuestionModule, CourseModule, ConfigModule],
    controllers: [AssignmentController],
    providers: [AssignmentService, ConfigService],
    exports: [AssignmentService],
})
export class AssignmentModule { } 