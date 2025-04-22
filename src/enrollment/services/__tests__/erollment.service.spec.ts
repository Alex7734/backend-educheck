import { Test, TestingModule } from '@nestjs/testing';
import { EnrollmentService } from '../enrollment.service';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { CourseService } from '../../../course/services/course.service';
import { UserService } from '../../../user/services/user.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Enrollment } from '../../entities/enrollment.entity';
import { AssignmentService } from '../../../assignment/assignment.service';

describe('EnrollmentService', () => {
    let service: EnrollmentService;
    let enrollmentRepository: any;
    let courseService: CourseService;
    let userService: UserService;
    let assignmentService: AssignmentService;

    const mockUser = {
        id: '123e4567-e89b-12d3-a456-426614174001',
        name: 'Test User',
        email: 'test@test.com',
        password: 'password',
    };

    const mockCourse = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Test Course',
        description: 'Test Description',
        isActive: true,
        numberOfStudents: 10,
    };

    const mockEnrollmentRepository = {
        create: jest.fn(),
        findOne: jest.fn(),
        find: jest.fn(),
        remove: jest.fn(),
        save: jest.fn(),
        update: jest.fn(),
    };

    const mockCourseService = {
        findCourseById: jest.fn(),
        updateEnrollmentCount: jest.fn(),
    };

    const mockUserService = {
        viewUser: jest.fn(),
        updateEnrollmentCount: jest.fn(),
        findUserByEmail: jest.fn(),
    };

    const mockAssignmentService = {
        findByCourseId: jest.fn(),
        findById: jest.fn(),
        findByUserId: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EnrollmentService,
                {
                    provide: getRepositoryToken(Enrollment),
                    useValue: mockEnrollmentRepository,
                },
                {
                    provide: CourseService,
                    useValue: mockCourseService,
                },
                {
                    provide: UserService,
                    useValue: mockUserService,
                },
                {
                    provide: AssignmentService,
                    useValue: mockAssignmentService,
                },
            ],
        }).compile();

        service = module.get<EnrollmentService>(EnrollmentService);
        enrollmentRepository = module.get(getRepositoryToken(Enrollment));
        courseService = module.get<CourseService>(CourseService);
        userService = module.get<UserService>(UserService);
        assignmentService = module.get<AssignmentService>(AssignmentService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('enrollUserInCourse', () => {
        const courseId = '123e4567-e89b-12d3-a456-426614174000';
        const userId = '123e4567-e89b-12d3-a456-426614174001';
        const mockCourse = { id: courseId, title: 'Test Course' };
        const mockUser = { id: userId, name: 'Test User' };

        it('should enroll user in course successfully', async () => {
            mockCourseService.findCourseById.mockResolvedValue(mockCourse);
            mockUserService.viewUser.mockResolvedValue(mockUser);
            mockEnrollmentRepository.findOne.mockResolvedValue(null);
            mockEnrollmentRepository.create.mockReturnValue({ course: mockCourse, user: mockUser });
            mockEnrollmentRepository.save.mockResolvedValue({ id: 'enrollment-id', course: mockCourse, user: mockUser });

            const result = await service.enrollUserInCourse(courseId, userId);

            expect(result).toEqual(mockCourse);
            expect(mockCourseService.findCourseById).toHaveBeenCalledWith(courseId);
            expect(mockUserService.viewUser).toHaveBeenCalledWith(userId);
            expect(mockEnrollmentRepository.findOne).toHaveBeenCalled();
            expect(mockEnrollmentRepository.create).toHaveBeenCalled();
            expect(mockEnrollmentRepository.save).toHaveBeenCalled();
            expect(mockCourseService.updateEnrollmentCount).toHaveBeenCalledWith(courseId, 1);
            expect(mockUserService.updateEnrollmentCount).toHaveBeenCalledWith(userId, 1);
        });

        it('should throw ForbiddenException if user already enrolled', async () => {
            mockCourseService.findCourseById.mockResolvedValue(mockCourse);
            mockUserService.viewUser.mockResolvedValue(mockUser);
            mockEnrollmentRepository.findOne.mockResolvedValue({ id: 'existing-enrollment' });

            await expect(service.enrollUserInCourse(courseId, userId))
                .rejects
                .toThrow(ForbiddenException);
        });

        it('should throw NotFoundException if user not found', async () => {
            mockCourseService.findCourseById.mockResolvedValue(mockCourse);
            mockUserService.viewUser.mockResolvedValue(null);

            await expect(service.enrollUserInCourse(courseId, userId))
                .rejects
                .toThrow(NotFoundException);
        });

        it('should throw NotFoundException if course not found', async () => {
            mockCourseService.findCourseById.mockResolvedValue(null);
            mockUserService.viewUser.mockResolvedValue(mockUser);

            await expect(service.enrollUserInCourse(courseId, userId))
                .rejects
                .toThrow(ForbiddenException);
        });
    });

    describe('unenrollUserFromCourse', () => {
        const courseId = '123e4567-e89b-12d3-a456-426614174000';
        const userId = '123e4567-e89b-12d3-a456-426614174001';
        const mockEnrollment = { id: 'enrollment-id', course: { id: courseId }, user: { id: userId } };

        it('should unenroll user from course successfully', async () => {
            mockEnrollmentRepository.findOne.mockResolvedValue(mockEnrollment);

            const result = await service.unenrollUserFromCourse(courseId, userId);

            expect(result).toEqual({ message: 'User unenrolled successfully' });
            expect(mockEnrollmentRepository.remove).toHaveBeenCalledWith(mockEnrollment);
            expect(mockCourseService.updateEnrollmentCount).toHaveBeenCalledWith(courseId, -1);
            expect(mockUserService.updateEnrollmentCount).toHaveBeenCalledWith(userId, -1);
        });

        it('should throw NotFoundException if enrollment not found', async () => {
            mockEnrollmentRepository.findOne.mockResolvedValue(null);

            await expect(service.unenrollUserFromCourse(courseId, userId))
                .rejects
                .toThrow(NotFoundException);
        });
    });

    describe('getUserEnrollments', () => {
        const userId = '123e4567-e89b-12d3-a456-426614174001';

        it('should return user enrollments', async () => {
            const mockEnrollments = [
                { id: '123e4567-e89b-12d3-a456-426614174000', course: { id: '123e4567-e89b-12d3-a456-426614174000' } },
                { id: '123e4567-e89b-12d3-a456-426614174001', course: { id: '123e4567-e89b-12d3-a456-426614174001' } },
            ];
            mockEnrollmentRepository.find.mockResolvedValue(mockEnrollments);

            const result = await service.getUserEnrollments(userId);

            expect(result).toEqual(mockEnrollments);
        });

        it('should not throw NotFoundException if no enrollments found, but return an empty array', async () => {
            mockEnrollmentRepository.find.mockResolvedValue([]);

            await expect(service.getUserEnrollments(userId))
                .resolves
                .toEqual([]);
        });
    });

    describe('getCourseEnrollments', () => {
        const courseId = '123e4567-e89b-12d3-a456-426614174000';

        it('should return course enrollments', async () => {
            const mockEnrollments = [
                { id: '123e4567-e89b-12d3-a456-426614174000', user: { id: '123e4567-e89b-12d3-a456-426614174000' } },
                { id: '123e4567-e89b-12d3-a456-426614174001', user: { id: '123e4567-e89b-12d3-a456-426614174001' } },
            ];
            mockEnrollmentRepository.find.mockResolvedValue(mockEnrollments);

            const result = await service.getCourseEnrollments(courseId);

            expect(result).toEqual(mockEnrollments);
        });

        it('should not throw NotFoundException if no enrollments found, but return an empty array', async () => {
            mockEnrollmentRepository.find.mockResolvedValue([]);

            await expect(service.getCourseEnrollments(courseId))
                .resolves
                .toEqual([]);
        });
    });

    describe('getEnrollmentState', () => {
        const courseId = '123e4567-e89b-12d3-a456-426614174000';
        const userId = '123e4567-e89b-12d3-a456-426614174001';
        const mockEnrollment = {
            id: 'enrollment-id',
            user: { id: userId },
            course: { id: courseId },
            enrollmentDate: new Date('2024-01-01'),
            dateLastAttempt: null,
            testPassed: false,
            completed: false
        };

        it('should return enrollment state', async () => {
            mockEnrollmentRepository.findOne.mockResolvedValue(mockEnrollment);

            const result = await service.getEnrollmentState(courseId, userId);

            expect(result).toEqual({
                userId,
                courseId,
                enrollmentDate: mockEnrollment.enrollmentDate,
                lastAttemptDate: null,
                isPassed: false,
                isCompleted: false,
                nextPossibleAttempt: null
            });
        });

        it('should return state with waiting period when test failed', async () => {
            const lastAttempt = new Date('2024-01-02');
            const mockEnrollmentWithAttempt = {
                ...mockEnrollment,
                dateLastAttempt: lastAttempt,
                testPassed: false
            };
            mockEnrollmentRepository.findOne.mockResolvedValue(mockEnrollmentWithAttempt);

            const result = await service.getEnrollmentState(courseId, userId);

            expect(result).toEqual({
                userId,
                courseId,
                enrollmentDate: mockEnrollment.enrollmentDate,
                lastAttemptDate: lastAttempt,
                isPassed: false,
                isCompleted: false,
                nextPossibleAttempt: new Date(lastAttempt.getTime() + 60000) // 1 minute waiting period
            });
        });

        it('should throw NotFoundException when enrollment not found', async () => {
            mockEnrollmentRepository.findOne.mockResolvedValue(null);

            await expect(service.getEnrollmentState(courseId, userId))
                .rejects
                .toThrow(NotFoundException);
        });
    });

    describe('submitAssignmentAnswers', () => {
        const courseId = '123e4567-e89b-12d3-a456-426614174000';
        const userId = '123e4567-e89b-12d3-a456-426614174001';
        const mockEnrollment = {
            id: 'enrollment-id',
            user: { id: userId },
            course: { id: courseId },
            enrollmentDate: new Date(),
            dateLastAttempt: null,
            testPassed: false,
            completed: false
        };

        const mockAssignment = {
            id: 'assignment-id',
            questions: [
                { id: 'q1', questionText: 'What is 2+2?', answer: '4' },
                { id: 'q2', questionText: 'What is the capital of France?', answer: 'Paris' }
            ]
        };

        beforeEach(() => {
            mockEnrollmentRepository.findOne.mockResolvedValue(mockEnrollment);
            mockAssignmentService.findByCourseId.mockResolvedValue(mockAssignment);
        });

        it('should submit correct answers and pass the test', async () => {
            const answers = [
                { questionId: 'q1', answer: '4' },
                { questionId: 'q2', answer: 'Paris' }
            ];

            const result = await service.submitAssignmentAnswers(courseId, userId, answers);

            expect(result).toEqual({
                passed: true,
                correctAnswers: 2,
                totalQuestions: 2,
                minimumRequired: 1
            });
            expect(mockEnrollmentRepository.update).toHaveBeenCalledWith(mockEnrollment.id, {
                dateLastAttempt: expect.any(Date),
                testPassed: true,
                completed: true
            });
        });

        it('should submit incorrect answers and fail the test', async () => {
            const answers = [
                { questionId: 'q1', answer: '5' },
                { questionId: 'q2', answer: 'London' }
            ];

            const result = await service.submitAssignmentAnswers(courseId, userId, answers);

            expect(result).toEqual({
                passed: false,
                correctAnswers: 0,
                totalQuestions: 2,
                minimumRequired: 1
            });
            expect(mockEnrollmentRepository.update).toHaveBeenCalledWith(mockEnrollment.id, {
                dateLastAttempt: expect.any(Date),
                testPassed: false,
                completed: false
            });
        });

        it('should throw ForbiddenException when test already passed', async () => {
            mockEnrollmentRepository.findOne.mockResolvedValue({
                ...mockEnrollment,
                testPassed: true
            });

            const answers = [
                { questionId: 'q1', answer: '4' },
                { questionId: 'q2', answer: 'Paris' }
            ];

            await expect(service.submitAssignmentAnswers(courseId, userId, answers))
                .rejects
                .toThrow(ForbiddenException);
        });

        it('should throw NotFoundException when assignment not found', async () => {
            mockAssignmentService.findByCourseId.mockResolvedValue(null);

            const answers = [
                { questionId: 'q1', answer: '4' },
                { questionId: 'q2', answer: 'Paris' }
            ];

            await expect(service.submitAssignmentAnswers(courseId, userId, answers))
                .rejects
                .toThrow(NotFoundException);
        });

        it('should throw BadRequestException when not all questions are answered', async () => {
            const answers = [
                { questionId: 'q1', answer: '4' }
            ];

            await expect(service.submitAssignmentAnswers(courseId, userId, answers))
                .rejects
                .toThrow(BadRequestException);
        });

        it('should throw BadRequestException when invalid question ID is provided', async () => {
            const answers = [
                { questionId: 'invalid-id', answer: '4' },
                { questionId: 'q2', answer: 'Paris' }
            ];

            await expect(service.submitAssignmentAnswers(courseId, userId, answers))
                .rejects
                .toThrow(BadRequestException);
        });
    });
});