import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { Admin } from '../src/user/entities/admin.entity';
import { CreateAdminDto } from '../src/user/dto/admin/create-admin.dto';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { getTestDataSource } from '../src/config/test.config';

describe('AdminController (e2e)', () => {
    let app: INestApplication;
    let dataSource: DataSource;
    let configService: ConfigService;
    let adminSecret: string;

    const mockAdmin = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Admin',
        email: 'admin@example.com',
        password: 'hashedPassword123',
        age: 30,
        hasWeb3Access: true,
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        configService = moduleFixture.get<ConfigService>(ConfigService);
        adminSecret = configService.get<string>('app.adminSecret') || '';

        dataSource = getTestDataSource(configService);
        await dataSource.initialize();

        await dataSource.synchronize(true);

        await app.init();
    });

    beforeEach(async () => {
        await dataSource.query('TRUNCATE TABLE "refresh_token" CASCADE');
        await dataSource.query('TRUNCATE TABLE "admin" CASCADE');
    });

    afterAll(async () => {
        await dataSource.query('TRUNCATE TABLE "refresh_token" CASCADE');
        await dataSource.query('TRUNCATE TABLE "admin" CASCADE');
        await dataSource.destroy();
        await app.close();
    });

    describe('/admin (POST)', () => {
        const createAdminDto: CreateAdminDto = {
            name: 'New Admin',
            email: 'newadmin@example.com',
            password: 'password123',
            age: 30,
            hasWeb3Access: true,
        };

        it('should create a new admin when valid secret is provided', () => {
            return request(app.getHttpServer())
                .post('/admin')
                .query({ secret: adminSecret })
                .send(createAdminDto)
                .expect(201)
                .expect((res) => {
                    expect(res.body).toEqual(expect.objectContaining({
                        name: createAdminDto.name,
                        email: createAdminDto.email,
                        age: createAdminDto.age,
                        hasWeb3Access: createAdminDto.hasWeb3Access,
                    }));
                    expect(res.body.password).toBeUndefined();
                    expect(res.body.id).toBeDefined();
                });
        });

        it('should return 403 when invalid secret is provided', () => {
            return request(app.getHttpServer())
                .post('/admin')
                .query({ secret: 'invalid-secret' })
                .send(createAdminDto)
                .expect(403);
        });

        it('should return 400 when creating admin with existing email', async () => {
            await dataSource
                .createQueryBuilder()
                .insert()
                .into(Admin)
                .values({
                    ...createAdminDto,
                    id: '123e4567-e89b-12d3-a456-426614174002'
                })
                .execute();

            return request(app.getHttpServer())
                .post('/admin')
                .query({ secret: adminSecret })
                .send(createAdminDto)
                .expect(400);
        });
    });

    describe('/admin (GET)', () => {
        beforeEach(async () => {
            await dataSource
                .createQueryBuilder()
                .insert()
                .into(Admin)
                .values(mockAdmin)
                .execute();
        });

        it('should return all admins when valid secret is provided', () => {
            return request(app.getHttpServer())
                .get('/admin')
                .query({ secret: adminSecret })
                .expect(200)
                .expect((res) => {
                    expect(res.body).toHaveLength(1);
                    expect(res.body[0]).toEqual(expect.objectContaining({
                        name: mockAdmin.name,
                        email: mockAdmin.email,
                        hasWeb3Access: mockAdmin.hasWeb3Access,
                    }));
                    expect(res.body[0].password).toBeUndefined();
                });
        });

        it('should return 403 when invalid secret is provided', () => {
            return request(app.getHttpServer())
                .get('/admin')
                .query({ secret: 'invalid-secret' })
                .expect(403);
        });

        it('should return empty array when no admins exist', async () => {
            await dataSource.query('TRUNCATE TABLE "admin" CASCADE');

            return request(app.getHttpServer())
                .get('/admin')
                .query({ secret: adminSecret })
                .expect(200)
                .expect((res) => {
                    expect(res.body).toHaveLength(0);
                });
        });
    });

    describe('/admin/:id (GET)', () => {
        beforeEach(async () => {
            await dataSource
                .createQueryBuilder()
                .insert()
                .into(Admin)
                .values(mockAdmin)
                .execute();
        });

        it('should return admin by id when valid secret is provided', () => {
            return request(app.getHttpServer())
                .get(`/admin/${mockAdmin.id}`)
                .query({ secret: adminSecret })
                .expect(200)
                .expect((res) => {
                    expect(res.body).toEqual(expect.objectContaining({
                        name: mockAdmin.name,
                        email: mockAdmin.email,
                        hasWeb3Access: mockAdmin.hasWeb3Access,
                    }));
                    expect(res.body.password).toBeUndefined();
                });
        });

        it('should return 403 when invalid secret is provided', () => {
            return request(app.getHttpServer())
                .get(`/admin/${mockAdmin.id}`)
                .query({ secret: 'invalid-secret' })
                .expect(403);
        });

        it('should return 404 for non-existent admin', () => {
            return request(app.getHttpServer())
                .get('/admin/123e4567-e89b-12d3-a456-426614174999')
                .query({ secret: adminSecret })
                .expect(404);
        });
    });

    describe('/admin/:id (DELETE)', () => {
        beforeEach(async () => {
            await dataSource
                .createQueryBuilder()
                .insert()
                .into(Admin)
                .values(mockAdmin)
                .execute();
        });

        it('should delete admin when valid secret is provided', () => {
            return request(app.getHttpServer())
                .delete(`/admin/${mockAdmin.id}`)
                .query({ secret: adminSecret })
                .expect(200);
        });

        it('should return 403 when invalid secret is provided', () => {
            return request(app.getHttpServer())
                .delete(`/admin/${mockAdmin.id}`)
                .query({ secret: 'invalid-secret' })
                .expect(403);
        });

        it('should return 404 when deleting non-existent admin', () => {
            return request(app.getHttpServer())
                .delete('/admin/123e4567-e89b-12d3-a456-426614174999')
                .query({ secret: adminSecret })
                .expect(404);
        });
    });

    describe('Secret validation', () => {
        it('should return 403 when no secret is provided', () => {
            return request(app.getHttpServer())
                .get('/admin')
                .expect(403);
        });

        it('should return 403 when empty secret is provided', () => {
            return request(app.getHttpServer())
                .get('/admin')
                .query({ secret: '' })
                .expect(403);
        });
    });
});