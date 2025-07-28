import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  env: process.env.NODE_ENV || 'development',
  host: process.env.HOST || '127.0.0.1',
  port: parseInt(process.env.PORT ?? '3030', 10),
}));
