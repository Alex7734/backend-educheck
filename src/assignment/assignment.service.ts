import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Assignment } from './entities/assignment.entity';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { Question } from '../question/entities/question.entity';
import { CourseService } from '../course/services/course.service';

@Injectable()
export class AssignmentService {
    constructor(
        @InjectRepository(Assignment)
        private readonly assignmentRepository: Repository<Assignment>,
        @InjectRepository(Question)
        private readonly questionRepository: Repository<Question>,
        private readonly courseService: CourseService
    ) { }

    async create(createAssignmentDto: CreateAssignmentDto) {
        try {
            if (!createAssignmentDto.courseId) {
                throw new BadRequestException('Course ID is required');
            }

            if (!Array.isArray(createAssignmentDto.questions) || createAssignmentDto.questions.length === 0) {
                throw new BadRequestException('At least one question is required');
            }

            const course = await this.courseService.findCourseById(createAssignmentDto.courseId);
            if (!course) {
                throw new NotFoundException(`Course with id ${createAssignmentDto.courseId} not found`);
            }

            const existingAssignment = await this.assignmentRepository.findOne({
                where: { course: { id: createAssignmentDto.courseId } },
                relations: ['course']
            });

            if (existingAssignment) {
                throw new ForbiddenException(`Course ${createAssignmentDto.courseId} already has an assignment. Use update instead.`);
            }

            const assignment = this.assignmentRepository.create({
                course: { id: createAssignmentDto.courseId }
            });

            const savedAssignment = await this.assignmentRepository.save(assignment);

            const questions = createAssignmentDto.questions.map(questionDto => {
                if (!questionDto.questionText || !questionDto.answer) {
                    throw new BadRequestException('Question text and answer are required for all questions');
                }
                return this.questionRepository.create({
                    questionText: questionDto.questionText,
                    answer: questionDto.answer,
                    assignment: savedAssignment
                });
            });

            await this.questionRepository.save(questions);

            return this.findByCourseId(createAssignmentDto.courseId);
        } catch (error) {
            if (error instanceof BadRequestException || error instanceof NotFoundException) {
                throw error;
            }
            throw new BadRequestException(`Failed to create assignment: ${error.message}`);
        }
    }

    async findByCourseId(courseId: string) {
        const assignment = await this.assignmentRepository.findOne({
            where: { course: { id: courseId } },
            relations: ['questions', 'course']
        });

        if (!assignment) {
            throw new NotFoundException(`Assignment for course ${courseId} not found`);
        }

        return assignment;
    }

    async updateByCourseId(courseId: string, updateAssignmentDto: UpdateAssignmentDto) {
        const assignment = await this.findByCourseId(courseId);

        if (updateAssignmentDto.questions) {
            await this.questionRepository.delete({ assignment: { id: assignment.id } });

            const questions = updateAssignmentDto.questions.map(questionDto =>
                this.questionRepository.create({
                    questionText: questionDto.questionText,
                    answer: questionDto.answer,
                    assignment
                })
            );

            await this.questionRepository.save(questions);
        }

        return this.findByCourseId(courseId);
    }

    async removeByCourseId(courseId: string) {
        const assignment = await this.findByCourseId(courseId);
        await this.assignmentRepository.remove(assignment);
    }
} 