import { Controller, Post, Body, Param, Get, Delete, Patch, UseInterceptors, UseFilters, HttpStatus, Query } from '@nestjs/common';
import { CourseService } from './services/course.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { GetCourseDto } from './dto/get-course.dto';
import { ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import { SerializeInterceptor } from '../common/interceptors/serialize.interceptor';
import { ValidationExceptionFilter } from '../common/filters/validation-exception.filter';
import { plainToInstance } from 'class-transformer';
import { SuccessData, SuccessAction } from '../common/types/generics';

@ApiTags('courses')
@UseFilters(ValidationExceptionFilter)
@UseInterceptors(SerializeInterceptor)
@Controller('courses')
export class CourseController {
  constructor(private readonly courseService: CourseService) { }

  @ApiOperation({ summary: 'Create a new course' })
  @ApiResponse({ status: 201, description: 'Course created successfully.', type: GetCourseDto })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @Post()
  async createCourse(@Body() createCourseDto: CreateCourseDto): Promise<SuccessData<GetCourseDto>> {
    const course = await this.courseService.createCourse(createCourseDto);
    return { statusCode: HttpStatus.CREATED, data: plainToInstance(GetCourseDto, course) };
  }

  @ApiOperation({ summary: 'Retrieve all courses' })
  @ApiResponse({ status: 200, description: 'Retrieved courses successfully.', type: [GetCourseDto] })
  @ApiQuery({ name: 'search', required: false, description: 'Search courses by title' })
  @ApiQuery({ name: 'isActive', required: false, description: 'Filter by active status' })
  @Get()
  async findAllCourses(
    @Query('search') search?: string,
    @Query('isActive') isActive?: boolean,
  ): Promise<SuccessData<GetCourseDto[]>> {
    const courses = await this.courseService.findAllCourses(search, isActive);
    return { statusCode: HttpStatus.OK, data: courses.map(course => plainToInstance(GetCourseDto, course)) };
  }

  @ApiOperation({ summary: 'Retrieve a course by ID' })
  @ApiResponse({ status: 200, description: 'Retrieved course successfully.', type: GetCourseDto })
  @ApiResponse({ status: 404, description: 'Course not found.' })
  @Get(':id')
  async findCourseById(@Param('id') id: string): Promise<SuccessData<GetCourseDto>> {
    const course = await this.courseService.findCourseById(id);
    return { statusCode: HttpStatus.OK, data: plainToInstance(GetCourseDto, course) };
  }

  @ApiOperation({ summary: 'Update a course by ID' })
  @ApiResponse({ status: 200, description: 'Course updated successfully.', type: GetCourseDto })
  @ApiResponse({ status: 404, description: 'Course not found.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @Patch(':id')
  async updateCourse(@Param('id') id: string, @Body() updateCourseDto: CreateCourseDto): Promise<SuccessData<GetCourseDto>> {
    const course = await this.courseService.updateCourse(id, updateCourseDto);
    return { statusCode: HttpStatus.OK, data: plainToInstance(GetCourseDto, course) };
  }

  @ApiOperation({ summary: 'Remove a course by ID' })
  @ApiResponse({ status: 200, description: 'Course removed successfully.' })
  @ApiResponse({ status: 404, description: 'Course not found.' })
  @Delete(':id')
  async removeCourse(@Param('id') id: string): Promise<SuccessAction> {
    const result = await this.courseService.removeCourse(id);
    return { statusCode: result.status, message: result.message };
  }
}