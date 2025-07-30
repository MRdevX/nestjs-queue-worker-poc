import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import dbConfig from '@root/app/config/db.config';
import s2sConfig from '@root/app/config/s2s.config';
import appConfig from '@root/app/config/app.config';
import { entities } from './database/entities';
import { MessagingModule } from './messaging/messaging.module';
import { UtilsService } from './utils/utils.service';
import { HealthModule } from './health/health.module';

@Global()
@Module({
  imports: [
    MessagingModule,
    HealthModule,
    ScheduleModule.forRoot(),
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
  providers: [UtilsService],
  exports: [UtilsService],
})
export class CoreModule {}
