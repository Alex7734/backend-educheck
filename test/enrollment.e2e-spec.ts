import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';
import { Course } from '../src/course/entities/course.entity';
import { User } from '../src/user/entities/user.entity';
import { Enrollment } from '../src/enrollment/entities/enrollment.entity';

describe('EnrollmentController (e2e)', () => {
    let app: INestApplication;
    let dataSource: DataSource;

    const mockUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test User',
        email: 'test@example.com',
        password: 'hashedPassword',
        age: 25,
        numberOfEnrolledCourses: 0,
    };

    const mockCourse = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Test Course',
        description: 'Test Description',
        isActive: true,
        numberOfStudents: 0,
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        dataSource = moduleFixture.get<DataSource>(DataSource);
        await app.init();
    });

    beforeEach(async () => {
        await dataSource.query('TRUNCATE TABLE "enrollment" CASCADE');
        await dataSource.query('TRUNCATE TABLE "course" CASCADE');
        await dataSource.query('TRUNCATE TABLE "user" CASCADE');

        await dataSource.getRepository(User).save(mockUser);
        await dataSource.getRepository(Course).save(mockCourse);
    });

    afterAll(async () => {
        await dataSource.query('TRUNCATE TABLE "enrollment" CASCADE');
        await dataSource.query('TRUNCATE TABLE "course" CASCADE');
        await dataSource.query('TRUNCATE TABLE "user" CASCADE');
        await app.close();
    });

    describe('/enrollments/course-enroll/:courseId/user/:userId (POST)', () => {
        it('should enroll user in course', async () => {
            const response = await request(app.getHttpServer())
                .post(`/enrollments/course-enroll/${mockCourse.id}/user/${mockUser.id}`)
                .expect(201);

            expect(response.body.data).toEqual({
                id: mockCourse.id,
                title: 'Test Course',
                description: 'Test Description',
                isActive: true,
                numberOfStudents: 0
            });

            const enrollment = await dataSource
                .getRepository(Enrollment)
                .findOne({
                    where: {
                        course: { id: mockCourse.id },
                        user: { id: mockUser.id }
                    },
                    relations: ['course', 'user']
                });

            expect(enrollment).toBeDefined();
        });

        it('should prevent duplicate enrollment', () => {
            return request(app.getHttpServer())
                .post(`/enrollments/course-enroll/${mockCourse.id}/user/${mockUser.id}`)
                .expect(201)
                .then(() =>
                    request(app.getHttpServer())
                        .post(`/enrollments/course-enroll/${mockCourse.id}/user/${mockUser.id}`)
                        .expect(403)
                );
        });
    });

    describe('/enrollments/course-unenroll/:courseId/user/:userId (DELETE)', () => {
        beforeEach(async () => {
            await request(app.getHttpServer())
                .post(`/enrollments/course-enroll/${mockCourse.id}/user/${mockUser.id}`)
                .expect(201);
        });

        it('should unenroll user from course', async () => {
            await request(app.getHttpServer())
                .delete(`/enrollments/course-unenroll/${mockCourse.id}/user/${mockUser.id}`)
                .expect(200);

            const enrollment = await dataSource
                .getRepository(Enrollment)
                .findOne({
                    where: {
                        course: { id: mockCourse.id },
                        user: { id: mockUser.id }
                    }
                });

            expect(enrollment).toBeNull();
        });
    });

    describe('/enrollments/user/:userId (GET)', () => {
        beforeEach(async () => {
            await request(app.getHttpServer())
                .post(`/enrollments/course-enroll/${mockCourse.id}/user/${mockUser.id}`)
                .expect(201);
        });

        it('should return user enrollments', async () => {
            const response = await request(app.getHttpServer())
                .get(`/enrollments/user/${mockUser.id}`)
                .expect(200);

            expect(response.body.data).toHaveLength(1);
            expect(response.body.data[0].course.id).toBe(mockCourse.id);
            expect(response.body.data[0].user.id).toBe(mockUser.id);
        });

        it('should return 200 when user has no enrollments and return an empty array', async () => {
            await request(app.getHttpServer())
                .delete(`/enrollments/course-unenroll/${mockCourse.id}/user/${mockUser.id}`)
                .expect(200);

            await request(app.getHttpServer())
                .get(`/enrollments/user/${mockUser.id}`)
                .expect(200)
                .then((response) => {
                    expect(response.body.data).toEqual([]);
                });
        });
    });

    describe('/enrollments/course/:courseId (GET)', () => {
        beforeEach(async () => {
            await request(app.getHttpServer())
                .post(`/enrollments/course-enroll/${mockCourse.id}/user/${mockUser.id}`)
                .expect(201);
        });

        it('should return course enrollments', async () => {
            const response = await request(app.getHttpServer())
                .get(`/enrollments/course/${mockCourse.id}`)
                .expect(200);

            expect(response.body.data).toHaveLength(1);
            expect(response.body.data[0].course.id).toBe(mockCourse.id);
            expect(response.body.data[0].user.id).toBe(mockUser.id);
        });

        it('should return 200 when course has no enrollments and return an empty array', async () => {
            await request(app.getHttpServer())
                .delete(`/enrollments/course-unenroll/${mockCourse.id}/user/${mockUser.id}`)
                .expect(200);

            await request(app.getHttpServer())
                .get(`/enrollments/course/${mockCourse.id}`)
                .expect(200)
                .then((response) => {
                    expect(response.body.data).toEqual([]);
                });
        });
    });

    describe('/enrollments/state/:courseId/user/:userId (GET)', () => {
        beforeEach(async () => {
            await request(app.getHttpServer())
                .post(`/enrollments/course-enroll/${mockCourse.id}/user/${mockUser.id}`)
                .expect(201);
        });

        it('should return enrollment state', async () => {
            const response = await request(app.getHttpServer())
                .get(`/enrollments/state/${mockCourse.id}/user/${mockUser.id}`)
                .expect(200);

            expect(response.body.data).toEqual({
                userId: mockUser.id,
                courseId: mockCourse.id,
                enrollmentDate: expect.any(String),
                lastAttemptDate: null,
                isPassed: false,
                isCompleted: false,
                nextPossibleAttempt: null
            });
        });

        it('should return 400 when enrollment not found', async () => {
            await request(app.getHttpServer())
                .get(`/enrollments/state/non-existent-course-id/user/${mockUser.id}`)
                .expect(400);
        });
    });

    describe('/enrollments/submit-assignment/:courseId/user/:userId (POST)', () => {
        let assignmentId: string;
        let questionId: string;
        let assignmentResponse: any;

        beforeEach(async () => {
            await request(app.getHttpServer())
                .post(`/enrollments/course-enroll/${mockCourse.id}/user/${mockUser.id}`)
                .expect(201);

            const createAssignmentDto = {
                questions: [
                    {
                        questionText: 'What is 2+2?',
                        answer: '4',
                    },
                    {
                        questionText: 'What is the capital of France?',
                        answer: 'Paris',
                    },
                ],
            };

            assignmentResponse = await request(app.getHttpServer())
                .post(`/assignments/course/${mockCourse.id}`)
                .send(createAssignmentDto)
                .expect(201);

            assignmentId = assignmentResponse.body.data.id;
            questionId = assignmentResponse.body.data.questions[0].id;
        });

        it('should submit assignment answers successfully', async () => {
            const submitAnswersDto = [
                {
                    questionId,
                    answer: '4',
                },
                {
                    questionId: assignmentResponse.body.data.questions[1].id,
                    answer: 'Paris',
                },
            ];

            const response = await request(app.getHttpServer())
                .post(`/enrollments/submit-assignment/${mockCourse.id}/user/${mockUser.id}`)
                .send(submitAnswersDto)
                .expect(201);

            const stateResponse = await request(app.getHttpServer())
                .get(`/enrollments/state/${mockCourse.id}/user/${mockUser.id}`)
                .expect(200);

            expect(stateResponse.body.data).toEqual({
                userId: mockUser.id,
                courseId: mockCourse.id,
                enrollmentDate: expect.any(String),
                lastAttemptDate: expect.any(String),
                isPassed: true,
                isCompleted: true,
                nextPossibleAttempt: null
            });
        });

        it('should prevent submitting when test already passed', async () => {
            const correctAnswers = [
                {
                    questionId,
                    answer: '4',
                },
                {
                    questionId: assignmentResponse.body.data.questions[1].id,
                    answer: 'Paris',
                },
            ];

            await request(app.getHttpServer())
                .post(`/enrollments/submit-assignment/${mockCourse.id}/user/${mockUser.id}`)
                .send(correctAnswers)
                .expect(201);

            await request(app.getHttpServer())
                .post(`/enrollments/submit-assignment/${mockCourse.id}/user/${mockUser.id}`)
                .send(correctAnswers)
                .expect(403);
        });

        it('should enforce waiting period between attempts', async () => {
            const submitAnswersDto = [
                {
                    questionId,
                    answer: '5',
                },
                {
                    questionId: assignmentResponse.body.data.questions[1].id,
                    answer: 'London',
                },
            ];

            await request(app.getHttpServer())
                .post(`/enrollments/submit-assignment/${mockCourse.id}/user/${mockUser.id}`)
                .send(submitAnswersDto)
                .expect(201);

            await request(app.getHttpServer())
                .post(`/enrollments/submit-assignment/${mockCourse.id}/user/${mockUser.id}`)
                .send(submitAnswersDto)
                .expect(403);
        });

        it('should return 400 when enrollment not found', async () => {
            const submitAnswersDto = [
                {
                    questionId,
                    answer: '4',
                },
            ];

            await request(app.getHttpServer())
                .post(`/enrollments/submit-assignment/non-existent-course-id/user/${mockUser.id}`)
                .send(submitAnswersDto)
                .expect(400);
        });
    });
});