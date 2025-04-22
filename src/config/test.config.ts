import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSource, DataSourceOptions } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { Admin } from '../user/entities/admin.entity';
import { Course } from '../course/entities/course.entity';
import { Enrollment } from '../enrollment/entities/enrollment.entity';
import { RefreshToken } from '../user/entities/refresh-token.entity';
import { Assignment } from '../assignment/entities/assignment.entity';
import { Question } from '../question/entities/question.entity';

export const testConfig = {
    app: {
        jwtSecret: process.env.JWT_SECRET || 'test-jwt-secret',
        jwtExpirationTime: process.env.JWT_EXPIRATION_TIME || '1h',
        adminSecret: process.env.ADMIN_SECRET || 'admin',
        nodeEnv: process.env.NODE_ENV || 'test',
    }
};

export const getTestDbConfig = (configService: ConfigService): TypeOrmModuleOptions => ({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5433', 10),
    username: process.env.DATABASE_USERNAME || 'admin',
    password: process.env.DATABASE_PASSWORD || 'changeit',
    database: process.env.DATABASE_NAME || 'pg4django_test',
    entities: [User, Admin, Course, Enrollment, RefreshToken, Assignment, Question],
    synchronize: true,
    logging: true,
});

export const getTestDataSource = (configService: ConfigService): DataSource => {
    return new DataSource(getTestDbConfig(configService) as DataSourceOptions);
};

export class TestConfigService extends ConfigService {
    constructor() {
        super();
    }

    get(key: string) {
        const parts = key.split('.');
        let value = testConfig;
        for (const part of parts) {
            value = value[part];
        }
        return value;
    }
} 