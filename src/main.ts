import helmet from 'helmet';
import { NestFactory, Reflector } from '@nestjs/core';
import {
  ClassSerializerInterceptor,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app/app.module';
import logger from './logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const appConfig = configService.get('app');
  const s2sConfig = configService.get('s2s');

  const environment = appConfig.env;
  const apiPrefix = '/api';

  app.enableShutdownHooks();

  app.connectMicroservice(s2sConfig.options);
  app.use(helmet());
  app.enableCors({ origin: true, credentials: true });
  app.setGlobalPrefix(apiPrefix, {
    exclude: ['/'],
  });
  app.enableVersioning({
    type: VersioningType.URI,
  });

  // app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  await app.startAllMicroservices();

  await app.listen(appConfig.port, appConfig.host);
  const appUrl = await app.getUrl();
  logger.info(`Application is running on: ${appUrl}`);
  logger.info(`Environment: ${environment}`);
}

process.nextTick(bootstrap);
