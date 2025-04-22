import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';
import { Course } from '../src/course/entities/course.entity';
import { Assignment } from '../src/assignment/entities/assignment.entity';
import { Question } from '../src/question/entities/question.entity';
import { ConfigService } from '@nestjs/config';

describe('AssignmentController (e2e)', () => {
    let app: INestApplication;
    let dataSource: DataSource;
    let configService: ConfigService;

    const mockCourse = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Test Course',
        description: 'Test Description',
        isActive: true,
        numberOfStudents: 0,
    };

    const mockAssignment = {
        id: '123e4567-e89b-12d3-a456-426614174001',
        course: mockCourse,
        questions: [
            {
                id: '123e4567-e89b-12d3-a456-426614174002',
                questionText: 'Test Question',
                answer: 'Test Answer',
            },
        ],
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        dataSource = moduleFixture.get<DataSource>(DataSource);
        configService = moduleFixture.get<ConfigService>(ConfigService);
        await app.init();
    });

    beforeEach(async () => {
        await dataSource.query('TRUNCATE TABLE "question" CASCADE');
        await dataSource.query('TRUNCATE TABLE "assignment" CASCADE');
        await dataSource.query('TRUNCATE TABLE "course" CASCADE');

        await dataSource.getRepository(Course).save(mockCourse);
    });

    afterAll(async () => {
        await dataSource.query('TRUNCATE TABLE "question" CASCADE');
        await dataSource.query('TRUNCATE TABLE "assignment" CASCADE');
        await dataSource.query('TRUNCATE TABLE "course" CASCADE');
        await app.close();
    });

    describe('/assignments/course/:courseId (POST)', () => {
        it('should create an assignment for a course', async () => {
            const createAssignmentDto = {
                questions: [
                    {
                        questionText: 'Test Question',
                        answer: 'Test Answer',
                    },
                ],
            };

            const response = await request(app.getHttpServer())
                .post(`/assignments/course/${mockCourse.id}`)
                .send(createAssignmentDto)
                .expect(201);

            expect(response.body.data).toEqual(
                expect.objectContaining({
                    id: expect.any(String),
                    questions: expect.arrayContaining([
                        expect.objectContaining({
                            questionText: 'Test Question',
                            answer: 'Test Answer',
                        }),
                    ]),
                }),
            );

            const assignment = await dataSource
                .getRepository(Assignment)
                .findOne({
                    where: { course: { id: mockCourse.id } },
                    relations: ['questions', 'course'],
                });

            expect(assignment).toBeDefined();
            expect(assignment?.questions).toHaveLength(1);
        });

        it('should prevent creating multiple assignments for the same course', async () => {
            const createAssignmentDto = {
                questions: [
                    {
                        questionText: 'Test Question',
                        answer: 'Test Answer',
                    },
                ],
            };

            await request(app.getHttpServer())
                .post(`/assignments/course/${mockCourse.id}`)
                .send(createAssignmentDto)
                .expect(201);

            await request(app.getHttpServer())
                .post(`/assignments/course/${mockCourse.id}`)
                .send(createAssignmentDto)
                .expect(400);
        });
    });

    describe('/assignments/course/:courseId (GET)', () => {
        beforeEach(async () => {
            const createAssignmentDto = {
                questions: [
                    {
                        questionText: 'Test Question',
                        answer: 'Test Answer',
                    },
                ],
            };

            await request(app.getHttpServer())
                .post(`/assignments/course/${mockCourse.id}`)
                .send(createAssignmentDto)
                .expect(201);
        });

        it('should return assignment with answers when admin secret is provided', async () => {
            const adminSecret = configService.get<string>('app.adminSecret');
            const response = await request(app.getHttpServer())
                .get(`/assignments/course/${mockCourse.id}?adminSecret=${adminSecret}`)
                .expect(200);

            expect(response.body.data).toEqual(
                expect.objectContaining({
                    id: expect.any(String),
                    questions: expect.arrayContaining([
                        expect.objectContaining({
                            questionText: 'Test Question',
                            answer: 'Test Answer',
                        }),
                    ]),
                }),
            );
        });

        it('should return 400 when assignment not found', async () => {
            await request(app.getHttpServer())
                .get(`/assignments/course/non-existent-course-id`)
                .expect(400);
        });
    });

    describe('/assignments/course/:courseId (PATCH)', () => {
        beforeEach(async () => {
            const createAssignmentDto = {
                questions: [
                    {
                        questionText: 'Test Question',
                        answer: 'Test Answer',
                    },
                ],
            };

            await request(app.getHttpServer())
                .post(`/assignments/course/${mockCourse.id}`)
                .send(createAssignmentDto)
                .expect(201);
        });

        it('should update assignment questions', async () => {
            const updateAssignmentDto = {
                questions: [
                    {
                        questionText: 'Updated Question',
                        answer: 'Updated Answer',
                    },
                ],
            };

            const response = await request(app.getHttpServer())
                .patch(`/assignments/course/${mockCourse.id}`)
                .send(updateAssignmentDto)
                .expect(200);

            expect(response.body.data).toEqual(
                expect.objectContaining({
                    id: expect.any(String),
                    questions: expect.arrayContaining([
                        expect.objectContaining({
                            questionText: 'Updated Question',
                            answer: 'Updated Answer',
                        }),
                    ]),
                }),
            );
        });

        it('should return 400 when updating non-existent assignment', async () => {
            const updateAssignmentDto = {
                questions: [
                    {
                        questionText: 'Updated Question',
                        answer: 'Updated Answer',
                    },
                ],
            };

            await request(app.getHttpServer())
                .patch(`/assignments/course/non-existent-course-id`)
                .send(updateAssignmentDto)
                .expect(400);
        });
    });

    describe('/assignments/course/:courseId (DELETE)', () => {
        beforeEach(async () => {
            const createAssignmentDto = {
                questions: [
                    {
                        questionText: 'Test Question',
                        answer: 'Test Answer',
                    },
                ],
            };

            await request(app.getHttpServer())
                .post(`/assignments/course/${mockCourse.id}`)
                .send(createAssignmentDto)
                .expect(201);
        });

        it('should delete assignment', async () => {
            await request(app.getHttpServer())
                .delete(`/assignments/course/${mockCourse.id}`)
                .expect(200);

            const assignment = await dataSource
                .getRepository(Assignment)
                .findOne({
                    where: { course: { id: mockCourse.id } },
                });

            expect(assignment).toBeNull();
        });

        it('should return 400 when deleting non-existent assignment', async () => {
            await request(app.getHttpServer())
                .delete(`/assignments/course/non-existent-course-id`)
                .expect(400);
        });
    });
}); 