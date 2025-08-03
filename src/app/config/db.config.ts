import { DataSourceOptions } from 'typeorm';
import { registerAs } from '@nestjs/config';

export default registerAs(
  'db',
  (): DataSourceOptions => ({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'queue_worker',
    synchronize: process.env.DB_SYNCHRONIZE === 'true',
  }),
);
