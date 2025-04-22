jest.mock('bcryptjs', () => ({
    hash: jest.fn().mockImplementation(async (str) => `$2a$10$${str}`),
    compare: jest.fn().mockImplementation(async (plain, hashed) => plain === hashed.slice(7))
}));

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';
import { User } from '../src/user/entities/user.entity';
import { Admin } from '../src/user/entities/admin.entity';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcryptjs';
import { ConfigService } from '@nestjs/config';
import { getTestDataSource } from '../src/config/test.config';
import { JwtService } from '@nestjs/jwt';
import { TestConfigService } from '../src/config/test.config';

describe('AuthController (e2e)', () => {
    let app: INestApplication;
    let dataSource: DataSource;
    let configService: ConfigService;
    let jwtService: JwtService;

    const testUser = {
        id: uuidv4(),
        email: 'test@example.com',
        password: 'TestPass123',
        name: 'Test User',
        age: 25,
        numberOfEnrolledCourses: 0,
    };

    const testAdmin = {
        id: uuidv4(),
        email: 'admin@example.com',
        password: 'AdminPass123',
        name: 'TestAdmin',
        age: 30,
        numberOfEnrolledCourses: 0,
        hasWeb3Access: true,
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
        jwtService = moduleFixture.get<JwtService>(JwtService);

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
        bcrypt.hash.mockClear();
        bcrypt.compare.mockClear();

        await dataSource.query('TRUNCATE TABLE "refresh_token" CASCADE');
        await dataSource.query('TRUNCATE TABLE "user" CASCADE');
        await dataSource.query('TRUNCATE TABLE "admin" CASCADE');

        const hashedUserPassword = await bcrypt.hash(testUser.password);
        await dataSource.getRepository(User).save({
            ...testUser,
            password: hashedUserPassword,
        });

        const hashedAdminPassword = await bcrypt.hash(testAdmin.password);
        await dataSource.getRepository(Admin).save({
            ...testAdmin,
            password: hashedAdminPassword,
        });
    });

    afterAll(async () => {
        await dataSource.query('TRUNCATE TABLE "refresh_token" CASCADE');
        await dataSource.query('TRUNCATE TABLE "user" CASCADE');
        await dataSource.query('TRUNCATE TABLE "admin" CASCADE');
        await dataSource.destroy();
        await app.close();
    });

    describe('/auth/sign-up (POST)', () => {
        const signUpDto = {
            email: 'newuser@example.com',
            password: 'TestPass123',
            name: 'New User',
            age: 25,
        };

        it('should create a new user', () => {
            return request(app.getHttpServer())
                .post('/auth/sign-up')
                .send(signUpDto)
                .expect(200)
                .expect((res) => {
                    expect(res.body.user).toBeDefined();
                    expect(res.body.accessToken).toBeDefined();
                    expect(res.body.refreshToken).toBeDefined();
                });
        });

        it('should return 400 for existing email', () => {
            return request(app.getHttpServer())
                .post('/auth/sign-up')
                .send({ ...signUpDto, email: testUser.email })
                .expect(400);
        });
    });

    describe('/auth/sign-in (POST)', () => {
        it('should authenticate valid user', () => {
            return request(app.getHttpServer())
                .post('/auth/sign-in')
                .send({
                    email: testUser.email,
                    password: testUser.password,
                })
                .expect(200)
                .expect((res) => {
                    expect(res.body.user).toBeDefined();
                    expect(res.body.accessToken).toBeDefined();
                    expect(res.body.refreshToken).toBeDefined();
                });
        });

        it('should return 401 for invalid credentials', () => {
            return request(app.getHttpServer())
                .post('/auth/sign-in')
                .send({
                    email: testUser.email,
                    password: 'wrongpassword',
                })
                .expect(401);
        });
    });

    describe('/auth/sign-in/admin (POST)', () => {
        it('should authenticate valid admin', () => {
            return request(app.getHttpServer())
                .post('/auth/sign-in/admin')
                .send({
                    email: testAdmin.email,
                    password: testAdmin.password,
                })
                .expect(200)
                .expect((res) => {
                    expect(res.body.user).toBeDefined();
                    expect(res.body.accessToken).toBeDefined();
                    expect(res.body.refreshToken).toBeDefined();
                    expect(res.body.user.hasWeb3Access).toBe(true);
                });
        });
    });

    describe('/auth/refresh-token (POST)', () => {
        let refreshToken: string;

        beforeEach(async () => {
            const response = await request(app.getHttpServer())
                .post('/auth/sign-in')
                .send({
                    email: testUser.email,
                    password: testUser.password,
                });
            refreshToken = response.body.refreshToken;
        });

        it('should provide new access token', () => {
            return request(app.getHttpServer())
                .post('/auth/refresh-token')
                .send({ refreshToken })
                .expect(200)
                .expect((res) => {
                    expect(res.body.accessToken).toBeDefined();
                });
        });

        it('should return 400 for invalid refresh token', () => {
            return request(app.getHttpServer())
                .post('/auth/refresh-token')
                .send({ refreshToken: 'invalid-token' })
                .expect(400);
        });
    });

    describe('/auth/sign-out (POST)', () => {
        let refreshToken: string;

        beforeEach(async () => {
            const response = await request(app.getHttpServer())
                .post('/auth/sign-in')
                .send({
                    email: testUser.email,
                    password: testUser.password,
                });
            refreshToken = response.body.refreshToken;
        });

        it('should sign out successfully', () => {
            return request(app.getHttpServer())
                .post('/auth/sign-out')
                .send({ refreshToken })
                .expect(200)
                .expect((res) => {
                    expect(res.body.description).toBe('User signed out successfully');
                });
        });
    });

    describe('Protected Routes', () => {
        let accessToken: string;

        beforeEach(async () => {
            const response = await request(app.getHttpServer())
                .post('/auth/sign-in')
                .send({
                    email: testUser.email,
                    password: testUser.password,
                });
            accessToken = response.body.accessToken;
        });

        describe('/auth/logged-in-users-count (POST)', () => {
            it('should require authentication', () => {
                return request(app.getHttpServer())
                    .post('/auth/logged-in-users-count')
                    .expect(401);
            });

            it('should return count with valid token', () => {
                return request(app.getHttpServer())
                    .post('/auth/logged-in-users-count')
                    .set('Authorization', `Bearer ${accessToken}`)
                    .expect(200)
                    .expect((res) => {
                        expect(typeof res.body).toBe('object');
                    });
            });
        });

        describe('/auth/logged-in-users (POST)', () => {
            it('should require authentication', () => {
                return request(app.getHttpServer())
                    .post('/auth/logged-in-users')
                    .expect(401);
            });

            it('should return users with valid token', () => {
                return request(app.getHttpServer())
                    .post('/auth/logged-in-users')
                    .set('Authorization', `Bearer ${accessToken}`)
                    .expect(200)
                    .expect((res) => {
                        expect(Array.isArray(res.body)).toBe(true);
                    });
            });
        });
    });
}); 