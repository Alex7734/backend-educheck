import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { ConfigService } from '@nestjs/config';
import { getTestDataSource } from '../src/config/test.config';
import { TestConfigService } from '../src/config/test.config';
import { DataSource } from 'typeorm';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let configService: ConfigService;

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

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual(expect.objectContaining({ status: 'API is running' }));
      });
  });
});