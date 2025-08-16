import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MessagingService } from './messaging.service';
import { RabbitMQSetupService } from './rabbitmq-setup.service';
import { NatsSetupService } from './nats-setup.service';
import { RedisSetupService } from './redis-setup.service';
import { RabbitMQProvider } from './providers/rabbitmq.provider';
import { NatsProvider } from './providers/nats.provider';
import { RedisProvider } from './providers/redis.provider';
import { IMessagingConfig } from './types/messaging.interface';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    MessagingService,
    {
      provide: 'ACTIVE_PROVIDER',
      useFactory: (configService: ConfigService) => {
        const s2sConfig = configService.get('s2s');
        const transport = s2sConfig?.transport || 'rmq';
        const config: IMessagingConfig = {
          transport: transport,
          options: s2sConfig?.options || {},
        };

        switch (transport) {
          case 'nats':
            return new NatsProvider(config);
          case 'redis':
            return new RedisProvider(config);
          case 'rmq':
          default:
            return new RabbitMQProvider(config);
        }
      },
      inject: [ConfigService],
    },
    {
      provide: 'ACTIVE_SETUP_SERVICE',
      useFactory: (configService: ConfigService) => {
        const s2sConfig = configService.get('s2s');
        const transport = s2sConfig?.transport || 'rmq';

        switch (transport) {
          case 'nats':
            return new NatsSetupService(configService);
          case 'redis':
            return new RedisSetupService(configService);
          case 'rmq':
          default:
            return new RabbitMQSetupService(configService);
        }
      },
      inject: [ConfigService],
    },
  ],
  exports: [MessagingService],
})
export class MessagingModule {}
