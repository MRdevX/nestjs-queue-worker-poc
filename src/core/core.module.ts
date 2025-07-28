import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import dbConfig from '@root/config/db.config';
import s2sConfig from '@root/config/s2s.config';
import appConfig from '@root/config/app.config';
import { entities } from './database/entities';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [appConfig, dbConfig, s2sConfig],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const dbConfig = configService.get('db');
        return {
          type: 'postgres',
          host: dbConfig.host,
          port: dbConfig.port,
          username: dbConfig.username,
          password: dbConfig.password,
          database: dbConfig.name,
          entities,
          synchronize: dbConfig.synchronize,
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class CoreModule {}
