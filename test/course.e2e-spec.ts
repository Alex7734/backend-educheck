import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { Course } from '../src/course/entities/course.entity';
import { CreateCourseDto } from '../src/course/dto/create-course.dto';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ConfigService } from '@nestjs/config';
import { getTestDataSource } from '../src/config/test.config';
import { TestConfigService } from '../src/config/test.config';

describe('CourseController (e2e)', () => {
    let app: INestApplication;
    let dataSource: DataSource;
    let configService: ConfigService;

    const testCourse = {
        id: uuidv4(),
        title: 'Test Course',
        description: 'Test Description',
        isActive: true,
        numberOfStudents: 0,
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideProvider(ConfigService)
            .useClass(TestConfigService)
            .compile();

        app = moduleFixture.createNestApplication();
        configService = moduleFixture.get<ConfigService>(ConfigService);

        app.useGlobalPipes(new ValidationPipe({
            whitelist: true,
            transform: true,
        }));

        dataSource = getTestDataSource(configService);
        await dataSource.initialize();
        await dataSource.synchronize(true);

        await app.init();
    });

    beforeEach(async () => {
        await dataSource.query('TRUNCATE TABLE "enrollment" CASCADE');
        await dataSource.query('TRUNCATE TABLE "course" CASCADE');

        // Create test course
        await dataSource.getRepository(Course).save(testCourse);
    });

    afterAll(async () => {
        await dataSource.query('TRUNCATE TABLE "enrollment" CASCADE');
        await dataSource.query('TRUNCATE TABLE "course" CASCADE');
        await dataSource.destroy();
        await app.close();
    });

    describe('/courses (POST)', () => {
        const createCourseDto: CreateCourseDto = {
            title: 'New Course',
            description: 'New Description',
            isActive: true,
        };

        it('should create a new course', async () => {
            const response = await request(app.getHttpServer())
                .post('/courses')
                .send(createCourseDto)
                .expect(201);

            expect(response.body.data).toEqual(expect.objectContaining({
                title: createCourseDto.title,
                description: createCourseDto.description,
                isActive: createCourseDto.isActive,
                numberOfStudents: 0,
            }));
            expect(response.body.data.id).toBeDefined();
        });
    });

    describe('/courses (GET)', () => {
        it('should return all courses', async () => {
            const response = await request(app.getHttpServer())
                .get('/courses')
                .expect(200);

            expect(response.body.data).toHaveLength(1);
            expect(response.body.data[0]).toEqual(expect.objectContaining({
                id: testCourse.id,
                title: testCourse.title,
                description: testCourse.description,
                isActive: testCourse.isActive,
            }));
        });
    });

    describe('/courses/:id (GET)', () => {
        it('should return course by id', async () => {
            const response = await request(app.getHttpServer())
                .get(`/courses/${testCourse.id}`)
                .expect(200);

            expect(response.body.data).toEqual(expect.objectContaining({
                id: testCourse.id,
                title: testCourse.title,
                description: testCourse.description,
                isActive: testCourse.isActive,
            }));
        });

        it('should return error for non-existent course', () => {
            const nonExistentId = uuidv4();
            return request(app.getHttpServer())
                .get(`/courses/${nonExistentId}`)
                .expect(500);
        });
    });

    describe('/courses/:id (PATCH)', () => {
        const updateCourseDto = {
            title: 'Updated Course',
            description: 'Updated Description',
            isActive: false,
        };

        it('should update course', async () => {
            const response = await request(app.getHttpServer())
                .patch(`/courses/${testCourse.id}`)
                .send(updateCourseDto)
                .expect(200);

            expect(response.body.data).toEqual(expect.objectContaining({
                id: testCourse.id,
                ...updateCourseDto,
            }));
        });

        it('should return error when updating non-existent course', () => {
            const nonExistentId = uuidv4();
            return request(app.getHttpServer())
                .patch(`/courses/${nonExistentId}`)
                .send(updateCourseDto)
                .expect(500);
        });
    });

    describe('/courses/:id (DELETE)', () => {
        it('should delete course', async () => {
            await request(app.getHttpServer())
                .delete(`/courses/${testCourse.id}`)
                .expect(200);

            const deletedCourse = await dataSource
                .getRepository(Course)
                .findOne({ where: { id: testCourse.id } });

            expect(deletedCourse).toBeNull();
        });

        it('should handle deleting non-existent course', async () => {
            const nonExistentId = uuidv4();
            const response = await request(app.getHttpServer())
                .delete(`/courses/${nonExistentId}`)
                .expect(200);

            expect(response.body.statusCode).toBe(404);
        });
    });

    describe('enrollment count updates', () => {
        it('should update number of students', async () => {
            const initialCourse = await dataSource
                .getRepository(Course)
                .findOne({ where: { id: testCourse.id } });

            if (!initialCourse) {
                throw new Error('Course not found');
            }

            expect(initialCourse.numberOfStudents).toBe(0);

            await dataSource
                .createQueryBuilder()
                .update(Course)
                .set({ numberOfStudents: () => '"numberOfStudents" + 1' })
                .where('id = :id', { id: testCourse.id })
                .execute();

            const updatedCourse = await dataSource
                .getRepository(Course)
                .findOne({ where: { id: testCourse.id } });

            if (!updatedCourse) {
                throw new Error('Course not found');
            }

            expect(updatedCourse.numberOfStudents).toBe(1);
        });
    });
});