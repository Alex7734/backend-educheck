import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from '../entities/course.entity';
import { CreateCourseDto } from '../dto/create-course.dto';
import { GetCourseDto } from '../dto/get-course.dto';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class CourseService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
  ) { }

  async createCourse(createCourseDto: CreateCourseDto): Promise<GetCourseDto> {
    const course = this.courseRepository.create(createCourseDto);
    const savedCourse = await this.courseRepository.save(course);
    return plainToInstance(GetCourseDto, savedCourse);
  }

  async findAllCourses(search?: string, isActive?: boolean): Promise<Course[]> {
    const queryBuilder = this.courseRepository.createQueryBuilder('course');

    if (search) {
      queryBuilder.andWhere('LOWER(course.title) LIKE LOWER(:search)', {
        search: `%${search}%`,
      });
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('course.isActive = :isActive', { isActive });
    }

    return queryBuilder.getMany();
  }

  async findCourseById(id: string): Promise<GetCourseDto> {
    const course = await this.courseRepository.findOne({ where: { id } });
    if (!course) {
      throw new Error(`Course with id ${id} not found`);
    }
    return plainToInstance(GetCourseDto, course);
  }

  async updateCourse(id: string, updateCourseDto: CreateCourseDto): Promise<GetCourseDto> {
    const course = await this.courseRepository.findOne({ where: { id } });
    if (!course) {
      throw new Error(`Course with id ${id} not found`);
    }
    const updatedCourse = this.courseRepository.merge(course, updateCourseDto);
    const savedCourse = await this.courseRepository.save(updatedCourse);
    return plainToInstance(GetCourseDto, savedCourse);
  }

  async removeCourse(id: string): Promise<{ message: string, status: number }> {
    try {
      const course = await this.courseRepository.findOne({ where: { id } });
      if (!course) {
        throw new Error(`Course with id ${id} not found`);
      }

      await this.courseRepository.remove(course);
      return { message: `Course with id ${id} removed`, status: 200 };
    } catch (error) {
      return { message: `Course with id ${id} not found`, status: 404 };
    }
  }

  async updateEnrollmentCount(courseId: string, change: number): Promise<void> {
    await this.courseRepository
      .createQueryBuilder()
      .update(Course)
      .set({
        numberOfStudents: () => `"numberOfStudents" + ${change}`
      })
      .where("id = :id", { id: courseId })
      .execute();
  }
}