import { Test, TestingModule } from '@nestjs/testing';
import { EnrollmentController } from '../enrollment.controller';
import { EnrollmentService } from '../services/enrollment.service';
import { HttpStatus, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';

describe('EnrollmentController', () => {
    let controller: EnrollmentController;
    let service: EnrollmentService;

    const mockEnrollmentService = {
        enrollUserInCourse: jest.fn(),
        unenrollUserFromCourse: jest.fn(),
        getUserEnrollments: jest.fn(),
        getCourseEnrollments: jest.fn(),
        getEnrollmentState: jest.fn(),
        submitAssignmentAnswers: jest.fn(),
    };

    const mockCourse = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Test Course',
        description: 'Test Description',
        isActive: true,
        numberOfStudents: 10,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [EnrollmentController],
            providers: [
                {
                    provide: EnrollmentService,
                    useValue: mockEnrollmentService,
                },
            ],
        }).compile();

        controller = module.get<EnrollmentController>(EnrollmentController);
        service = module.get<EnrollmentService>(EnrollmentService);
    });

    describe('enrollUser', () => {
        const courseId = '123e4567-e89b-12d3-a456-426614174000';
        const userId = '123e4567-e89b-12d3-a456-426614174001';

        it('should enroll user successfully', async () => {
            mockEnrollmentService.enrollUserInCourse.mockResolvedValue(mockCourse);

            const result = await controller.enrollUser(courseId, userId);

            expect(result).toEqual({
                statusCode: HttpStatus.OK,
                data: expect.objectContaining({
                    id: mockCourse.id,
                    title: mockCourse.title,
                    description: mockCourse.description,
                    isActive: mockCourse.isActive,
                    numberOfStudents: mockCourse.numberOfStudents,
                }),
            });
            expect(service.enrollUserInCourse).toHaveBeenCalledWith(courseId, userId);
        });
    });

    describe('unenrollUser', () => {
        const courseId = '123e4567-e89b-12d3-a456-426614174000';
        const userId = '123e4567-e89b-12d3-a456-426614174001';

        it('should unenroll user successfully', async () => {
            mockEnrollmentService.unenrollUserFromCourse.mockResolvedValue({
                message: 'User unenrolled successfully'
            });

            const result = await controller.unenrollUser(courseId, userId);

            expect(result).toEqual({
                statusCode: HttpStatus.OK,
                message: 'User unenrolled successfully'
            });
        });
    });

    describe('getUserEnrollments', () => {
        const userId = '123e4567-e89b-12d3-a456-426614174001';

        it('should return user enrollments', async () => {
            const mockEnrollments = [
                { id: '123e4567-e89b-12d3-a456-426614174000', course: { id: '123e4567-e89b-12d3-a456-426614174000' } },
                { id: '123e4567-e89b-12d3-a456-426614174001', course: { id: '123e4567-e89b-12d3-a456-426614174001' } },
            ];
            mockEnrollmentService.getUserEnrollments.mockResolvedValue(mockEnrollments);

            const result = await controller.getUserEnrollments(userId);

            expect(result).toEqual({
                statusCode: HttpStatus.OK,
                data: mockEnrollments
            });
        });
    });

    describe('getCourseEnrollments', () => {
        const courseId = '123e4567-e89b-12d3-a456-426614174000';

        it('should return course enrollments', async () => {
            const mockEnrollments = [
                { id: '123e4567-e89b-12d3-a456-426614174000', user: { id: '123e4567-e89b-12d3-a456-426614174000' } },
                { id: '123e4567-e89b-12d3-a456-426614174001', user: { id: '123e4567-e89b-12d3-a456-426614174001' } },
            ];
            mockEnrollmentService.getCourseEnrollments.mockResolvedValue(mockEnrollments);

            const result = await controller.getCourseEnrollments(courseId);

            expect(result).toEqual({
                statusCode: HttpStatus.OK,
                data: mockEnrollments
            });
        });
    });

    describe('getEnrollmentState', () => {
        const courseId = '123e4567-e89b-12d3-a456-426614174000';
        const userId = '123e4567-e89b-12d3-a456-426614174001';
        const mockState = {
            userId,
            courseId,
            enrollmentDate: new Date('2024-01-01'),
            lastAttemptDate: null,
            isPassed: false,
            isCompleted: false,
            nextPossibleAttempt: null
        };

        it('should return enrollment state', async () => {
            mockEnrollmentService.getEnrollmentState.mockResolvedValue(mockState);

            const result = await controller.getEnrollmentState(courseId, userId);

            expect(result).toEqual({
                statusCode: HttpStatus.OK,
                data: mockState
            });
            expect(service.getEnrollmentState).toHaveBeenCalledWith(courseId, userId);
        });

        it('should return 400 when enrollment not found', async () => {
            mockEnrollmentService.getEnrollmentState.mockRejectedValue(new NotFoundException('Enrollment not found'));

            await expect(controller.getEnrollmentState(courseId, userId))
                .rejects
                .toThrow(NotFoundException);
        });
    });

    describe('submitAssignment', () => {
        const courseId = '123e4567-e89b-12d3-a456-426614174000';
        const userId = '123e4567-e89b-12d3-a456-426614174001';
        const mockAnswers = [
            { questionId: 'q1', answer: '4' },
            { questionId: 'q2', answer: 'Paris' }
        ];
        const mockResult = {
            passed: true,
            correctAnswers: 2,
            totalQuestions: 2,
            minimumRequired: 1
        };

        it('should submit assignment answers successfully', async () => {
            mockEnrollmentService.submitAssignmentAnswers.mockResolvedValue(mockResult);

            const result = await controller.submitAssignment(courseId, userId, mockAnswers);

            expect(result).toEqual({
                statusCode: HttpStatus.OK,
                data: mockResult
            });
            expect(service.submitAssignmentAnswers).toHaveBeenCalledWith(courseId, userId, mockAnswers);
        });

        it('should return 400 when test already passed', async () => {
            mockEnrollmentService.submitAssignmentAnswers.mockRejectedValue(
                new ForbiddenException('Test already passed')
            );

            await expect(controller.submitAssignment(courseId, userId, mockAnswers))
                .rejects
                .toThrow(ForbiddenException);
        });

        it('should return 400 when waiting period not over', async () => {
            mockEnrollmentService.submitAssignmentAnswers.mockRejectedValue(
                new ForbiddenException('Please wait before attempting again')
            );

            await expect(controller.submitAssignment(courseId, userId, mockAnswers))
                .rejects
                .toThrow(ForbiddenException);
        });

        it('should return 400 when enrollment not found', async () => {
            mockEnrollmentService.submitAssignmentAnswers.mockRejectedValue(
                new NotFoundException('Enrollment not found')
            );

            await expect(controller.submitAssignment(courseId, userId, mockAnswers))
                .rejects
                .toThrow(NotFoundException);
        });

        it('should return 400 when assignment not found', async () => {
            mockEnrollmentService.submitAssignmentAnswers.mockRejectedValue(
                new NotFoundException('No assignment found for this course')
            );

            await expect(controller.submitAssignment(courseId, userId, mockAnswers))
                .rejects
                .toThrow(NotFoundException);
        });

        it('should return 400 when not all questions are answered', async () => {
            mockEnrollmentService.submitAssignmentAnswers.mockRejectedValue(
                new BadRequestException('Must answer all questions')
            );

            await expect(controller.submitAssignment(courseId, userId, mockAnswers))
                .rejects
                .toThrow(BadRequestException);
        });

        it('should return 400 when invalid question ID is provided', async () => {
            mockEnrollmentService.submitAssignmentAnswers.mockRejectedValue(
                new BadRequestException('Invalid question ID')
            );

            await expect(controller.submitAssignment(courseId, userId, mockAnswers))
                .rejects
                .toThrow(BadRequestException);
        });
    });
});