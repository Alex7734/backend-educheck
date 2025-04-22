import { Test, TestingModule } from '@nestjs/testing';
import { AssignmentController } from '../assignment.controller';
import { AssignmentService } from '../assignment.service';
import { CreateAssignmentDto } from '../dto/create-assignment.dto';
import { UpdateAssignmentDto } from '../dto/update-assignment.dto';
import { HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

describe('AssignmentController', () => {
    let controller: AssignmentController;
    let service: AssignmentService;

    const mockAssignmentService = {
        create: jest.fn(),
        findByCourseId: jest.fn(),
        updateByCourseId: jest.fn(),
        removeByCourseId: jest.fn(),
    };

    const mockConfigService = {
        get: jest.fn().mockReturnValue('test-secret'),
    };

    const mockAssignment = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        course: {
            id: '123e4567-e89b-12d3-a456-426614174001',
            title: 'Test Course',
        },
        questions: [
            {
                id: '123e4567-e89b-12d3-a456-426614174002',
                questionText: 'Test Question',
                answer: 'Test Answer',
            },
        ],
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AssignmentController],
            providers: [
                {
                    provide: AssignmentService,
                    useValue: mockAssignmentService,
                },
                {
                    provide: ConfigService,
                    useValue: mockConfigService,
                },
            ],
        }).compile();

        controller = module.get<AssignmentController>(AssignmentController);
        service = module.get<AssignmentService>(AssignmentService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('create', () => {
        const courseId = '123e4567-e89b-12d3-a456-426614174001';
        const createAssignmentDto: CreateAssignmentDto = {
            questions: [
                {
                    questionText: 'Test Question',
                    answer: 'Test Answer',
                },
            ],
            courseId: courseId
        };

        it('should create an assignment successfully', async () => {
            mockAssignmentService.create.mockResolvedValue(mockAssignment);

            const result = await controller.create(courseId, createAssignmentDto);

            expect(result).toEqual({
                statusCode: HttpStatus.CREATED,
                data: expect.objectContaining({
                    id: mockAssignment.id,
                    course: expect.objectContaining({
                        id: mockAssignment.course.id,
                        title: mockAssignment.course.title,
                    }),
                    questions: expect.arrayContaining([
                        expect.objectContaining({
                            id: mockAssignment.questions[0].id,
                            questionText: mockAssignment.questions[0].questionText,
                            answer: mockAssignment.questions[0].answer,
                        }),
                    ]),
                }),
            });
            expect(service.create).toHaveBeenCalledWith({
                ...createAssignmentDto,
                courseId,
            });
        });
    });

    describe('getByCourseId', () => {
        const courseId = '123e4567-e89b-12d3-a456-426614174001';

        it('should return assignment without answers for regular users', async () => {
            mockAssignmentService.findByCourseId.mockResolvedValue(mockAssignment);

            const result = await controller.getByCourseId(courseId);

            expect(result).toEqual({
                statusCode: HttpStatus.OK,
                data: expect.objectContaining({
                    id: mockAssignment.id,
                    course: expect.objectContaining({
                        id: mockAssignment.course.id,
                        title: mockAssignment.course.title,
                    }),
                    questions: expect.arrayContaining([
                        expect.objectContaining({
                            id: mockAssignment.questions[0].id,
                            questionText: mockAssignment.questions[0].questionText,
                        }),
                    ]),
                }),
            });
            expect(service.findByCourseId).toHaveBeenCalledWith(courseId);
        });

        it('should return assignment with answers for admin users', async () => {
            mockAssignmentService.findByCourseId.mockResolvedValue(mockAssignment);

            const result = await controller.getByCourseId(courseId, 'test-secret');

            expect(result).toEqual({
                statusCode: HttpStatus.OK,
                data: expect.objectContaining({
                    id: mockAssignment.id,
                    course: expect.objectContaining({
                        id: mockAssignment.course.id,
                        title: mockAssignment.course.title,
                    }),
                    questions: expect.arrayContaining([
                        expect.objectContaining({
                            id: mockAssignment.questions[0].id,
                            questionText: mockAssignment.questions[0].questionText,
                            answer: mockAssignment.questions[0].answer,
                        }),
                    ]),
                }),
            });
            expect(service.findByCourseId).toHaveBeenCalledWith(courseId);
        });
    });

    describe('update', () => {
        const courseId = '123e4567-e89b-12d3-a456-426614174001';
        const updateAssignmentDto: UpdateAssignmentDto = {
            questions: [
                {
                    questionText: 'Updated Question',
                    answer: 'Updated Answer',
                },
            ],
        };

        it('should update an assignment successfully', async () => {
            mockAssignmentService.updateByCourseId.mockResolvedValue(mockAssignment);

            const result = await controller.update(courseId, updateAssignmentDto);

            expect(result).toEqual({
                statusCode: HttpStatus.OK,
                data: expect.objectContaining({
                    id: mockAssignment.id,
                    course: expect.objectContaining({
                        id: mockAssignment.course.id,
                        title: mockAssignment.course.title,
                    }),
                    questions: expect.arrayContaining([
                        expect.objectContaining({
                            id: mockAssignment.questions[0].id,
                            questionText: mockAssignment.questions[0].questionText,
                            answer: mockAssignment.questions[0].answer,
                        }),
                    ]),
                }),
            });
            expect(service.updateByCourseId).toHaveBeenCalledWith(courseId, updateAssignmentDto);
        });
    });

    describe('remove', () => {
        const courseId = '123e4567-e89b-12d3-a456-426614174001';

        it('should remove an assignment successfully', async () => {
            mockAssignmentService.removeByCourseId.mockResolvedValue(undefined);

            const result = await controller.remove(courseId);

            expect(result).toEqual({
                statusCode: HttpStatus.OK,
                message: 'Assignment deleted successfully.',
            });
            expect(service.removeByCourseId).toHaveBeenCalledWith(courseId);
        });
    });
}); 