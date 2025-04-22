import { DataSource } from "typeorm";
import { User } from "./user/entities/user.entity";
import { Admin } from "./user/entities/admin.entity";
import { RefreshToken } from "./user/entities/refresh-token.entity";
import { Course } from "./course/entities/course.entity";
import { Enrollment } from "./enrollment/entities/enrollment.entity";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * This is the data source for the application which I use only for migrations
 * Sadly the way I configured the project in app.module.ts, the data source is not available for migrations
 * as it is built in the app.module.ts file.
 * 
 * So I created this file to be able to run migrations but I need to find a way to use it in the app.module.ts file without breaking my E2E tests
 */
export const AppDataSource = new DataSource({
    type: "postgres",
    host: process.env.DATABASE_HOST || "localhost",
    port: parseInt(process.env.DATABASE_PORT || "5432", 10),
    username: process.env.DATABASE_USERNAME || "admin",
    password: process.env.DATABASE_PASSWORD || "changeit",
    database: process.env.DATABASE_NAME || "pg4django",
    entities: [User, Admin, RefreshToken, Course, Enrollment],
    migrations: ["src/migrations/*.ts"],
    synchronize: false,
    logging: process.env.DATABASE_LOGGING === "true",
});
