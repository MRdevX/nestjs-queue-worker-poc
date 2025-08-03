import { DataSourceOptions } from 'typeorm';
import { registerAs } from '@nestjs/config';
import { entities } from '../core/database/entities';

export default registerAs(
  'db',
  (): DataSourceOptions => ({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'queue_worker',
    entities,
    synchronize: process.env.DB_SYNCHRONIZE === 'true',
    logging: process.env.NODE_ENV === 'development',
  }),
);
