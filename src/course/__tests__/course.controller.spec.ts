import { Test, TestingModule } from '@nestjs/testing';
import { CourseController } from '../course.controller';
import { CourseService } from '../services/course.service';
import { CreateCourseDto } from '../dto/create-course.dto';
import { HttpStatus } from '@nestjs/common';

describe('CourseController', () => {
  let controller: CourseController;
  let service: CourseService;

  const mockCourseService = {
    createCourse: jest.fn(),
    findAllCourses: jest.fn(),
    findCourseById: jest.fn(),
    updateCourse: jest.fn(),
    removeCourse: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CourseController],
      providers: [
        {
          provide: CourseService,
          useValue: mockCourseService,
        },
      ],
    }).compile();

    controller = module.get<CourseController>(CourseController);
    service = module.get<CourseService>(CourseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createCourse', () => {
    const createCourseDto: CreateCourseDto = {
      title: 'Test Course',
      description: 'Test Description',
      isActive: true,
    };

    it('should create a course successfully', async () => {
      const expectedCourse = {
        id: 'test-id',
        ...createCourseDto,
        numberOfStudents: 0,
      };

      mockCourseService.createCourse.mockResolvedValue(expectedCourse);

      const result = await controller.createCourse(createCourseDto);

      expect(result).toEqual({
        statusCode: HttpStatus.CREATED,
        data: expectedCourse,
      });
      expect(service.createCourse).toHaveBeenCalledWith(createCourseDto);
    });
  });

  describe('findAllCourses', () => {
    it('should return all courses', async () => {
      const expectedCourses = [
        { id: '1', name: 'Course 1' },
        { id: '2', name: 'Course 2' },
      ];

      mockCourseService.findAllCourses.mockResolvedValue(expectedCourses);

      const result = await controller.findAllCourses();

      expect(result).toEqual({
        statusCode: HttpStatus.OK,
        data: expectedCourses,
      });
      expect(service.findAllCourses).toHaveBeenCalled();
    });
  });

  describe('findCourseById', () => {
    const courseId = 'test-id';

    it('should return a course by id', async () => {
      const expectedCourse = { id: courseId, name: 'Test Course' };

      mockCourseService.findCourseById.mockResolvedValue(expectedCourse);

      const result = await controller.findCourseById(courseId);

      expect(result).toEqual({
        statusCode: HttpStatus.OK,
        data: expectedCourse,
      });
      expect(service.findCourseById).toHaveBeenCalledWith(courseId);
    });

    it('should throw error when course not found', async () => {
      mockCourseService.findCourseById.mockRejectedValue(new Error(`Course with id ${courseId} not found`));

      await expect(controller.findCourseById(courseId)).rejects.toThrow();
    });
  });

  describe('updateCourse', () => {
    const courseId = 'test-id';
    const updateCourseDto: CreateCourseDto = {
      title: 'Updated Course',
      description: 'Updated Description',
      isActive: false
    };

    it('should update a course successfully', async () => {
      const updatedCourse = { id: courseId, ...updateCourseDto };

      mockCourseService.updateCourse.mockResolvedValue(updatedCourse);

      const result = await controller.updateCourse(courseId, updateCourseDto);

      expect(result).toEqual({
        statusCode: HttpStatus.OK,
        data: updatedCourse,
      });
      expect(service.updateCourse).toHaveBeenCalledWith(courseId, updateCourseDto);
    });
  });

  describe('removeCourse', () => {
    const courseId = 'test-id';

    it('should remove a course successfully', async () => {
      const expectedResponse = { message: 'Course removed', status: 200 };

      mockCourseService.removeCourse.mockResolvedValue(expectedResponse);

      const result = await controller.removeCourse(courseId);

      expect(result).toEqual({
        statusCode: expectedResponse.status,
        message: expectedResponse.message,
      });
      expect(service.removeCourse).toHaveBeenCalledWith(courseId);
    });
  });
});