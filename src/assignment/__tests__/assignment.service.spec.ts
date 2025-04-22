import { Test, TestingModule } from '@nestjs/testing';
import { AssignmentService } from '../assignment.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Assignment } from '../entities/assignment.entity';
import { Question } from '../../question/entities/question.entity';
import { CourseService } from '../../course/services/course.service';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('AssignmentService', () => {
    let service: AssignmentService;
    let assignmentRepository: Repository<Assignment>;
    let questionRepository: Repository<Question>;
    let courseService: CourseService;

    const mockAssignmentRepository = {
        create: jest.fn(),
        save: jest.fn(),
        findOne: jest.fn(),
        remove: jest.fn(),
    };

    const mockQuestionRepository = {
        create: jest.fn(),
        save: jest.fn(),
        delete: jest.fn(),
    };

    const mockCourseService = {
        findCourseById: jest.fn(),
    };

    const mockCourse = {
        id: '123e4567-e89b-12d3-a456-426614174001',
        title: 'Test Course',
        description: 'Test Description',
        isActive: true,
        numberOfStudents: 0,
    };

    const mockAssignment = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        course: mockCourse,
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
            providers: [
                AssignmentService,
                {
                    provide: getRepositoryToken(Assignment),
                    useValue: mockAssignmentRepository,
                },
                {
                    provide: getRepositoryToken(Question),
                    useValue: mockQuestionRepository,
                },
                {
                    provide: CourseService,
                    useValue: mockCourseService,
                },
            ],
        }).compile();

        service = module.get<AssignmentService>(AssignmentService);
        assignmentRepository = module.get<Repository<Assignment>>(getRepositoryToken(Assignment));
        questionRepository = module.get<Repository<Question>>(getRepositoryToken(Question));
        courseService = module.get<CourseService>(CourseService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('create', () => {
        const createAssignmentDto = {
            courseId: '123e4567-e89b-12d3-a456-426614174001',
            questions: [
                {
                    questionText: 'Test Question',
                    answer: 'Test Answer',
                },
            ],
        };

        it('should create an assignment successfully', async () => {
            mockCourseService.findCourseById.mockResolvedValue(mockCourse);
            mockAssignmentRepository.findOne.mockResolvedValueOnce(null);
            mockAssignmentRepository.create.mockReturnValue(mockAssignment);
            mockAssignmentRepository.save.mockResolvedValue(mockAssignment);
            mockQuestionRepository.create.mockReturnValue(mockAssignment.questions[0]);
            mockQuestionRepository.save.mockResolvedValue(mockAssignment.questions);
            mockAssignmentRepository.findOne.mockResolvedValueOnce(mockAssignment);

            const result = await service.create(createAssignmentDto);

            expect(result).toEqual(mockAssignment);
            expect(mockCourseService.findCourseById).toHaveBeenCalledWith(createAssignmentDto.courseId);
            expect(mockAssignmentRepository.create).toHaveBeenCalledWith({
                course: { id: createAssignmentDto.courseId },
            });
            expect(mockQuestionRepository.create).toHaveBeenCalledWith({
                questionText: createAssignmentDto.questions[0].questionText,
                answer: createAssignmentDto.questions[0].answer,
                assignment: mockAssignment,
            });
            expect(mockAssignmentRepository.findOne).toHaveBeenCalledTimes(2);
        });

        it('should throw BadRequestException when courseId is missing', async () => {
            const invalidDto = { ...createAssignmentDto, courseId: '' };

            await expect(service.create(invalidDto)).rejects.toThrow(BadRequestException);
        });

        it('should throw BadRequestException when questions array is empty', async () => {
            const invalidDto = { ...createAssignmentDto, questions: [] };

            await expect(service.create(invalidDto)).rejects.toThrow(BadRequestException);
        });

        it('should throw NotFoundException when course does not exist', async () => {
            mockCourseService.findCourseById.mockResolvedValue(null);

            await expect(service.create(createAssignmentDto)).rejects.toThrow(NotFoundException);
        });

        it('should throw BadRequestException when course already has an assignment', async () => {
            mockCourseService.findCourseById.mockResolvedValue(mockCourse);
            mockAssignmentRepository.findOne.mockResolvedValue(mockAssignment);

            await expect(service.create(createAssignmentDto)).rejects.toThrow(BadRequestException);
        });
    });

    describe('findByCourseId', () => {
        const courseId = '123e4567-e89b-12d3-a456-426614174001';

        it('should return assignment by course ID', async () => {
            mockAssignmentRepository.findOne.mockResolvedValue(mockAssignment);

            const result = await service.findByCourseId(courseId);

            expect(result).toEqual(mockAssignment);
            expect(mockAssignmentRepository.findOne).toHaveBeenCalledWith({
                where: { course: { id: courseId } },
                relations: ['questions', 'course'],
            });
        });

        it('should throw NotFoundException when assignment not found', async () => {
            mockAssignmentRepository.findOne.mockResolvedValue(null);

            await expect(service.findByCourseId(courseId)).rejects.toThrow(NotFoundException);
        });
    });

    describe('updateByCourseId', () => {
        const courseId = '123e4567-e89b-12d3-a456-426614174001';
        const updateAssignmentDto = {
            questions: [
                {
                    questionText: 'Updated Question',
                    answer: 'Updated Answer',
                },
            ],
        };

        it('should update assignment successfully', async () => {
            mockAssignmentRepository.findOne.mockResolvedValue(mockAssignment);
            mockQuestionRepository.delete.mockResolvedValue({ affected: 1 });
            mockQuestionRepository.create.mockReturnValue(updateAssignmentDto.questions[0]);
            mockQuestionRepository.save.mockResolvedValue(updateAssignmentDto.questions);

            const result = await service.updateByCourseId(courseId, updateAssignmentDto);

            expect(result).toEqual(mockAssignment);
            expect(mockQuestionRepository.delete).toHaveBeenCalledWith({
                assignment: { id: mockAssignment.id },
            });
            expect(mockQuestionRepository.create).toHaveBeenCalledWith({
                questionText: updateAssignmentDto.questions[0].questionText,
                answer: updateAssignmentDto.questions[0].answer,
                assignment: mockAssignment,
            });
        });

        it('should throw NotFoundException when assignment not found', async () => {
            mockAssignmentRepository.findOne.mockResolvedValue(null);

            await expect(service.updateByCourseId(courseId, updateAssignmentDto)).rejects.toThrow(NotFoundException);
        });
    });

    describe('removeByCourseId', () => {
        const courseId = '123e4567-e89b-12d3-a456-426614174001';

        it('should remove assignment successfully', async () => {
            mockAssignmentRepository.findOne.mockResolvedValue(mockAssignment);
            mockAssignmentRepository.remove.mockResolvedValue(mockAssignment);

            await service.removeByCourseId(courseId);

            expect(mockAssignmentRepository.findOne).toHaveBeenCalledWith({
                where: { course: { id: courseId } },
                relations: ['questions', 'course'],
            });
            expect(mockAssignmentRepository.remove).toHaveBeenCalledWith(mockAssignment);
        });

        it('should throw NotFoundException when assignment not found', async () => {
            mockAssignmentRepository.findOne.mockResolvedValue(null);

            await expect(service.removeByCourseId(courseId)).rejects.toThrow(NotFoundException);
        });
    });
}); 