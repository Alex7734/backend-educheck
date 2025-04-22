import { Test, TestingModule } from '@nestjs/testing';
import { CourseService } from '../course.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Course } from '../../entities/course.entity';
import { Repository } from 'typeorm';
import { CreateCourseDto } from '../../dto/create-course.dto';
import { GetCourseDto } from '../../dto/get-course.dto';
import { plainToInstance } from 'class-transformer';

describe('CourseService', () => {
    let service: CourseService;
    let courseRepository: Repository<Course>;

    const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
    };

    const mockCourseRepository = {
        create: jest.fn(),
        save: jest.fn(),
        find: jest.fn(),
        findOne: jest.fn(),
        merge: jest.fn(),
        remove: jest.fn(),
        createQueryBuilder: jest.fn(() => mockQueryBuilder),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CourseService,
                {
                    provide: getRepositoryToken(Course),
                    useValue: mockCourseRepository,
                },
            ],
        }).compile();

        service = module.get<CourseService>(CourseService);
        courseRepository = module.get<Repository<Course>>(getRepositoryToken(Course));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createCourse', () => {
        const createCourseDto: CreateCourseDto = {
            title: 'Test Course',
            description: 'Test Description',
            isActive: true,
        };

        it('should create a new course successfully', async () => {
            const expectedCourse = {
                id: 'test-id',
                ...createCourseDto,
                numberOfStudents: 0,
            };

            mockCourseRepository.create.mockReturnValue(expectedCourse);
            mockCourseRepository.save.mockResolvedValue(expectedCourse);

            const result = await service.createCourse(createCourseDto);

            expect(result).toEqual(expectedCourse);
            expect(mockCourseRepository.create).toHaveBeenCalledWith(createCourseDto);
            expect(mockCourseRepository.save).toHaveBeenCalledWith(expectedCourse);
        });
    });

    describe('findAllCourses', () => {
        it('should return all courses', async () => {
            const mockCourses = [
                { id: '1', title: 'Course 1', description: 'Description 1', isActive: true, numberOfStudents: 0 },
                { id: '2', title: 'Course 2', description: 'Description 2', isActive: true, numberOfStudents: 0 },
            ];
            mockQueryBuilder.getMany.mockResolvedValue(mockCourses);

            const result = await service.findAllCourses();

            expect(result).toEqual(mockCourses.map(course => plainToInstance(GetCourseDto, course)));
            expect(mockCourseRepository.createQueryBuilder).toHaveBeenCalled();
        });

        it('should return empty array when no courses exist', async () => {
            mockQueryBuilder.getMany.mockResolvedValue([]);

            const result = await service.findAllCourses();

            expect(result).toEqual([]);
            expect(mockCourseRepository.createQueryBuilder).toHaveBeenCalled();
        });

        it('should filter by isActive', async () => {
            const mockCourses = [
                { id: '1', title: 'Test Course 1', description: 'Description 1', isActive: true, numberOfStudents: 0 },
                { id: '2', title: 'Another Course', description: 'Description 2', isActive: false, numberOfStudents: 0 },
                { id: '3', title: 'Test Course 2', description: 'Description 3', isActive: true, numberOfStudents: 0 },
            ];
            mockQueryBuilder.getMany.mockResolvedValue(mockCourses);

            const result = await service.findAllCourses(undefined, true);

            expect(result).toEqual(mockCourses.map(course => plainToInstance(GetCourseDto, course)));
            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
                'course.isActive = :isActive',
                { isActive: true }
            );
        });

        it('should search by title', async () => {
            const mockCourses = [
                { id: '1', title: 'Test Course 1', description: 'Description 1', isActive: true, numberOfStudents: 0 },
                { id: '2', title: 'Another Course', description: 'Description 2', isActive: false, numberOfStudents: 0 },
                { id: '3', title: 'Test Course 2', description: 'Description 3', isActive: true, numberOfStudents: 0 },
            ];
            mockQueryBuilder.getMany.mockResolvedValue(mockCourses);

            const result = await service.findAllCourses('Test');

            expect(result).toEqual(mockCourses.map(course => plainToInstance(GetCourseDto, course)));
            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
                'LOWER(course.title) LIKE LOWER(:search)',
                { search: '%Test%' }
            );
        });
    });

    describe('findCourseById', () => {
        const courseId = 'test-id';

        it('should return course when found', async () => {
            const mockCourse = { id: courseId, title: 'Test Course', description: 'Description', isActive: true, numberOfStudents: 0 };
            mockCourseRepository.findOne.mockResolvedValue(mockCourse);

            const result = await service.findCourseById(courseId);

            expect(result).toEqual(plainToInstance(GetCourseDto, mockCourse));
            expect(mockCourseRepository.findOne).toHaveBeenCalledWith({ where: { id: courseId } });
        });

        it('should throw error when course not found', async () => {
            mockCourseRepository.findOne.mockResolvedValue(null);

            await expect(service.findCourseById(courseId))
                .rejects
                .toThrow(`Course with id ${courseId} not found`);
        });
    });

    describe('updateCourse', () => {
        const courseId = 'test-id';
        const updateCourseDto: CreateCourseDto = {
            title: 'Updated Course',
            description: 'Updated Description',
            isActive: false
        };

        it('should update course successfully', async () => {
            const existingCourse = { id: courseId, title: 'Old Name', description: 'Old Description', isActive: true, numberOfStudents: 0 };
            const updatedCourse = { ...existingCourse, ...updateCourseDto };

            mockCourseRepository.findOne.mockResolvedValue(existingCourse);
            mockCourseRepository.merge.mockReturnValue(updatedCourse);
            mockCourseRepository.save.mockResolvedValue(updatedCourse);

            const result = await service.updateCourse(courseId, updateCourseDto);

            expect(result).toEqual(plainToInstance(GetCourseDto, updatedCourse));
            expect(mockCourseRepository.findOne).toHaveBeenCalledWith({ where: { id: courseId } });
            expect(mockCourseRepository.merge).toHaveBeenCalledWith(existingCourse, updateCourseDto);
            expect(mockCourseRepository.save).toHaveBeenCalledWith(updatedCourse);
        });

        it('should throw error when course not found', async () => {
            mockCourseRepository.findOne.mockResolvedValue(null);

            await expect(service.updateCourse(courseId, updateCourseDto))
                .rejects
                .toThrow(`Course with id ${courseId} not found`);
        });
    });

    describe('removeCourse', () => {
        const courseId = 'test-id';

        it('should remove course successfully', async () => {
            const course = { id: courseId, title: 'Test Course', description: 'Description', isActive: true, numberOfStudents: 0 };
            mockCourseRepository.findOne.mockResolvedValue(course);

            const result = await service.removeCourse(courseId);

            expect(result).toEqual({ message: `Course with id ${courseId} removed`, status: 200 });
            expect(mockCourseRepository.findOne).toHaveBeenCalledWith({ where: { id: courseId } });
            expect(mockCourseRepository.remove).toHaveBeenCalledWith(course);
        });

        it('should return 404 when course not found', async () => {
            mockCourseRepository.findOne.mockResolvedValue(null);

            const result = await service.removeCourse(courseId);

            expect(result).toEqual({ message: `Course with id ${courseId} not found`, status: 404 });
        });
    });

    describe('updateEnrollmentCount', () => {
        const courseId = 'test-id';
        const mockQueryBuilder = {
            update: jest.fn().mockReturnThis(),
            set: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            execute: jest.fn().mockResolvedValue({ affected: 1 }),
            andWhere: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockReturnThis(),
        };

        beforeEach(() => {
            mockCourseRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
        });

        it('should update enrollment count successfully', async () => {
            await service.updateEnrollmentCount(courseId, 1);

            expect(mockCourseRepository.createQueryBuilder).toHaveBeenCalled();
            expect(mockQueryBuilder.update).toHaveBeenCalledWith(Course);
            expect(mockQueryBuilder.set).toHaveBeenCalledWith({
                numberOfStudents: expect.any(Function)
            });
            expect(mockQueryBuilder.where).toHaveBeenCalledWith("id = :id", { id: courseId });
            expect(mockQueryBuilder.execute).toHaveBeenCalled();

            const setArg = mockQueryBuilder.set.mock.calls[0][0];
            const generatedSQL = setArg.numberOfStudents();
            expect(generatedSQL).toBe(`"numberOfStudents" + 1`);
        });

        it('should handle negative enrollment count changes', async () => {
            await service.updateEnrollmentCount(courseId, -1);

            expect(mockQueryBuilder.set).toHaveBeenCalledWith({
                numberOfStudents: expect.any(Function)
            });

            const setArg = mockQueryBuilder.set.mock.calls[0][0];
            const generatedSQL = setArg.numberOfStudents();
            expect(generatedSQL).toBe(`"numberOfStudents" + -1`);
        });
    });

});