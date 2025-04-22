import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Enrollment } from '../entities/enrollment.entity';
import { CourseService } from '../../course/services/course.service';
import { UserService } from '../../user/services/user.service';
import { AssignmentService } from '../../assignment/assignment.service';
import { EnrollmentState, SubmitAssignmentAnswers, SubmitAssignmentResult, UpdateCountResult } from '../../common/types/enrollment';
import { GetCourseDto } from '../../course/dto/get-course.dto';
import { RETRY_DELAY_MS } from '../../common/constants';

@Injectable()
export class EnrollmentService {
    constructor(
        @InjectRepository(Enrollment)
        private readonly enrollmentRepository: Repository<Enrollment>,
        private readonly courseService: CourseService,
        private readonly userService: UserService,
        private readonly assignmentService: AssignmentService
    ) { }

    private normalizeAnswer = (answer: string): string =>
        answer.toLowerCase().trim().replace(/\s+/g, ' ');

    private calculateNextAttempt = (lastAttempt: Date | null): Date | null =>
        lastAttempt ? new Date(lastAttempt.getTime() + RETRY_DELAY_MS) : null;

    private updateEnrollmentCounts = async ({ courseId, userId, delta }: UpdateCountResult): Promise<void> => {
        await Promise.all([
            this.courseService.updateEnrollmentCount(courseId, delta),
            this.userService.updateEnrollmentCount(userId, delta)
        ]);
    };

    private checkEnrollmentExists = async (courseId: string, userId: string): Promise<Enrollment | null> =>
        this.enrollmentRepository.findOne({
            where: { course: { id: courseId }, user: { id: userId } }
        });

    enrollUserInCourse = async (courseId: string, userId: string): Promise<GetCourseDto> => {
        const [course, user] = await Promise.all([
            this.courseService.findCourseById(courseId),
            this.userService.viewUser(userId)
        ]);

        if (!user) {
            throw new NotFoundException('User not found');
        }

        const existingEnrollment = await this.checkEnrollmentExists(courseId, userId);
        if (existingEnrollment) {
            throw new ForbiddenException('User already enrolled in this course');
        }

        const enrollment = this.enrollmentRepository.create({
            course,
            user,
            enrollmentDate: new Date(),
            completed: false,
            testPassed: false
        });

        await this.enrollmentRepository.save(enrollment);
        await this.updateEnrollmentCounts({ courseId, userId, delta: 1 });

        return course;
    };

    unenrollUserFromCourse = async (courseId: string, userId: string): Promise<{ message: string }> => {
        const enrollment = await this.checkEnrollmentExists(courseId, userId);
        if (!enrollment) {
            throw new NotFoundException('Enrollment not found');
        }

        await this.enrollmentRepository.remove(enrollment);
        await this.updateEnrollmentCounts({ courseId, userId, delta: -1 });

        return { message: 'User unenrolled successfully' };
    };

    getUserEnrollments = async (userId: string): Promise<Enrollment[]> => {
        const enrollments = await this.enrollmentRepository.find({
            where: { user: { id: userId } },
            relations: ['course', 'user']
        });

        return enrollments.length ? enrollments : [];
    };

    getCourseEnrollments = async (courseId: string): Promise<Enrollment[]> => {
        const enrollments = await this.enrollmentRepository.find({
            where: { course: { id: courseId } },
            relations: ['course', 'user']
        });

        return enrollments.length ? enrollments : [];
    };

    getEnrollmentState = async (courseId: string, userId: string): Promise<EnrollmentState> => {
        const enrollment = await this.enrollmentRepository.findOne({
            where: { course: { id: courseId }, user: { id: userId } },
            relations: ['course', 'user']
        });

        if (!enrollment) {
            throw new NotFoundException('Enrollment not found');
        }

        const nextPossibleAttempt = this.calculateNextAttempt(enrollment.dateLastAttempt);

        return {
            userId: enrollment.user.id,
            courseId: enrollment.course.id,
            enrollmentDate: enrollment.enrollmentDate,
            lastAttemptDate: enrollment.dateLastAttempt,
            isPassed: enrollment.testPassed,
            isCompleted: enrollment.completed,
            nextPossibleAttempt: !enrollment.testPassed && nextPossibleAttempt ? nextPossibleAttempt : null,
        };
    };

    submitAssignmentAnswers = async (
        courseId: string,
        userId: string,
        answers: SubmitAssignmentAnswers[]
    ): Promise<SubmitAssignmentResult> => {
        const [enrollment, assignment] = await Promise.all([
            this.checkEnrollmentExists(courseId, userId),
            this.assignmentService.findByCourseId(courseId)
        ]);

        if (!enrollment) {
            throw new NotFoundException('Enrollment not found');
        }

        if (enrollment.testPassed) {
            throw new ForbiddenException('Test already passed');
        }

        const now = new Date();
        if (enrollment.dateLastAttempt) {
            const nextPossibleAttempt = this.calculateNextAttempt(enrollment.dateLastAttempt);
            if (nextPossibleAttempt && now < nextPossibleAttempt) {
                throw new ForbiddenException(`Please wait until ${nextPossibleAttempt} before attempting again`);
            }
        }

        if (!assignment) {
            throw new NotFoundException('No assignment found for this course');
        }

        const questions = assignment.questions;
        if (!questions || questions.length === 0) {
            throw new BadRequestException('No questions found in the assignment');
        }

        if (answers.length !== questions.length) {
            throw new BadRequestException('Must answer all questions');
        }

        const correctAnswers = answers.reduce((count, answer) => {
            const question = questions.find(q => q.id === answer.questionId);
            if (!question) {
                throw new BadRequestException(`Invalid question ID: ${answer.questionId}`);
            }
            return this.normalizeAnswer(answer.answer) === this.normalizeAnswer(question.answer)
                ? count + 1
                : count;
        }, 0);

        const halfQuestions = Math.floor(questions.length / 2);
        const passed = correctAnswers >= halfQuestions;

        await this.enrollmentRepository.update(enrollment.id, {
            dateLastAttempt: now,
            testPassed: passed,
            completed: passed
        });

        return {
            passed,
            correctAnswers,
            totalQuestions: questions.length,
            minimumRequired: halfQuestions
        };
    };
} 