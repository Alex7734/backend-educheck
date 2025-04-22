import { registerAs } from '@nestjs/config';

export default registerAs('database', () => {
  return {
    type : process.env.DB_TYPE || 'postgres',
    host : process.env.DB_HOST || 'localhost',
    port : parseInt(process.env.DB_PORT || '5432', 10),
    username : process.env.DB_USERNAME || 'admin',
    password : process.env.DB_PASSWORD || 'changeit',
    database : process.env.DB_DATABASE || 'pg4django',
  };
});