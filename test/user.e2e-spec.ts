import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { User } from '../src/user/entities/user.entity';
import { UserType } from '../src/common/types/users';
import { CreateUserDto } from '../src/user/dto/user/create-user.dto';
import { UpdateUserDto } from '../src/user/dto/user/update-user.dto';
import { DataSource } from 'typeorm';
import { Admin } from '../src/user/entities/admin.entity';

describe('UserController (e2e)', () => {
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

    const mockAdmin = {
        id: '123e4567-e89b-12d3-a456-426614174001',
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'adminPassword',
        age: 30,
        numberOfEnrolledCourses: 0,
        hasWeb3Access: true,
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
        await dataSource.query('TRUNCATE TABLE "refresh_token" CASCADE');
        await dataSource.query('TRUNCATE TABLE "enrollment" CASCADE');
        await dataSource.query('TRUNCATE TABLE "user" CASCADE');
        await dataSource.query('TRUNCATE TABLE "admin" CASCADE');
    });

    afterAll(async () => {
        await dataSource.query('TRUNCATE TABLE "refresh_token" CASCADE');
        await dataSource.query('TRUNCATE TABLE "enrollment" CASCADE');
        await dataSource.query('TRUNCATE TABLE "user" CASCADE');
        await dataSource.query('TRUNCATE TABLE "admin" CASCADE');
        await app.close();
    });

    describe('/user (POST)', () => {
        const createUserDto: CreateUserDto = {
            name: 'New User',
            email: 'new@example.com',
            password: 'password123',
            age: 25,
        };

        it('should create a new user', () => {
            return request(app.getHttpServer())
                .post('/user')
                .send(createUserDto)
                .expect(201)
                .expect((res) => {
                    expect(res.body).toEqual(expect.objectContaining({
                        name: createUserDto.name,
                        email: createUserDto.email,
                        age: createUserDto.age,
                        numberOfEnrolledCourses: 0,
                    }));
                    expect(res.body.password).toBeUndefined();
                    expect(res.body.id).toBeDefined();
                });
        });

        it('should return 409 when creating user with existing email', async () => {
            await dataSource
                .createQueryBuilder()
                .insert()
                .into(User)
                .values({
                    ...createUserDto,
                    id: '123e4567-e89b-12d3-a456-426614174002'
                })
                .execute();

            return request(app.getHttpServer())
                .post('/user')
                .send(createUserDto)
                .expect(409);
        });
    });

    describe('/user (GET)', () => {
        beforeEach(async () => {
            await dataSource
                .createQueryBuilder()
                .insert()
                .into(User)
                .values(mockUser)
                .execute();

            await dataSource
                .createQueryBuilder()
                .insert()
                .into(Admin)
                .values(mockAdmin)
                .execute();
        });

        it('should return all users when no type specified', () => {
            return request(app.getHttpServer())
                .get('/user')
                .expect(200)
                .expect((res) => {
                    expect(res.body).toHaveLength(2);
                    expect(res.body[0]).toEqual(expect.objectContaining({
                        name: mockUser.name,
                        email: mockUser.email,
                    }));
                });
        });

        it('should return only users when type=users', () => {
            return request(app.getHttpServer())
                .get(`/user?type=${UserType.USERS}`)
                .expect(200)
                .expect((res) => {
                    expect(res.body).toHaveLength(1);
                    expect(res.body[0]).toEqual(expect.objectContaining({
                        name: mockUser.name,
                        email: mockUser.email,
                    }));
                });
        });

        it('should return only admins when type=admins', () => {
            return request(app.getHttpServer())
                .get(`/user?type=${UserType.ADMINS}`)
                .expect(200)
                .expect((res) => {
                    expect(res.body).toHaveLength(1);
                    expect(res.body[0]).toEqual(expect.objectContaining({
                        name: mockAdmin.name,
                        email: mockAdmin.email,
                    }));
                });
        });

        it('should return 400 for invalid user type', () => {
            return request(app.getHttpServer())
                .get('/user?type=invalid')
                .expect(400);
        });
    });

    describe('/user/:id (GET)', () => {
        beforeEach(async () => {
            await dataSource
                .createQueryBuilder()
                .insert()
                .into(User)
                .values(mockUser)
                .execute();
        });

        it('should return user by id', () => {
            return request(app.getHttpServer())
                .get(`/user/${mockUser.id}`)
                .expect(200)
                .expect((res) => {
                    expect(res.body).toEqual(expect.objectContaining({
                        name: mockUser.name,
                        email: mockUser.email,
                    }));
                });
        });

        it('should return 404 for non-existent user', () => {
            return request(app.getHttpServer())
                .get('/user/non-existent-id')
                .expect(404);
        });
    });

    describe('/user/:id (PATCH)', () => {
        const updateUserDto: UpdateUserDto = {
            name: 'Updated Name',
            age: 26,
        };

        beforeEach(async () => {
            await dataSource
                .createQueryBuilder()
                .insert()
                .into(User)
                .values(mockUser)
                .execute();
        });

        it('should update user', () => {
            return request(app.getHttpServer())
                .patch(`/user/${mockUser.id}`)
                .send(updateUserDto)
                .expect(200)
                .expect((res) => {
                    expect(res.body).toEqual(expect.objectContaining({
                        id: mockUser.id,
                        name: updateUserDto.name,
                        age: updateUserDto.age,
                        email: mockUser.email,
                    }));
                });
        });

        it('should return 404 when updating non-existent user', () => {
            return request(app.getHttpServer())
                .patch('/user/123e4567-e89b-12d3-a456-426614174999')
                .send(updateUserDto)
                .expect(404);
        });
    });

    describe('/user/:id (DELETE)', () => {
        beforeEach(async () => {
            await dataSource
                .createQueryBuilder()
                .insert()
                .into(User)
                .values(mockUser)
                .execute();
        });

        it('should delete user', () => {
            return request(app.getHttpServer())
                .delete(`/user/${mockUser.id}`)
                .expect(200);
        });

        it('should return 404 when deleting non-existent user', () => {
            return request(app.getHttpServer())
                .delete('/user/123e4567-e89b-12d3-a456-426614174999')
                .expect(404);
        });
    });

    describe('enrollment count updates', () => {
        beforeEach(async () => {
            await dataSource
                .createQueryBuilder()
                .insert()
                .into(User)
                .values(mockUser)
                .execute();
        });

        it('should update enrollment count', async () => {
            const initialResponse = await request(app.getHttpServer())
                .get(`/user/${mockUser.id}`)
                .expect(200);

            expect(initialResponse.body.numberOfEnrolledCourses).toBe(0);

            await dataSource
                .createQueryBuilder()
                .update(User)
                .set({ numberOfEnrolledCourses: () => '"numberOfEnrolledCourses" + 1' })
                .where('id = :id', { id: mockUser.id })
                .execute();

            const updatedResponse = await request(app.getHttpServer())
                .get(`/user/${mockUser.id}`)
                .expect(200);

            expect(updatedResponse.body.numberOfEnrolledCourses).toBe(1);
        });
    });
});