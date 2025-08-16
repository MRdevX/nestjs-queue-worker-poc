import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MessagingService } from './messaging.service';
import { RabbitMQSetupService } from './rabbitmq-setup.service';
import { NatsSetupService } from './nats-setup.service';
import { RedisSetupService } from './redis-setup.service';
import { RabbitMQProvider } from './providers/rabbitmq.provider';
import { NatsProvider } from './providers/nats.provider';
import { RedisProvider } from './providers/redis.provider';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    MessagingService,
    {
      provide: 'ACTIVE_PROVIDER',
      useFactory: (configService: ConfigService) => {
        const transport = configService.get('s2s.transport');
        switch (transport) {
          case 'nats':
            return NatsProvider;
          case 'redis':
            return RedisProvider;
          case 'rmq':
          default:
            return RabbitMQProvider;
        }
      },
      inject: [ConfigService],
    },
    {
      provide: 'ACTIVE_SETUP_SERVICE',
      useFactory: (configService: ConfigService) => {
        const transport = configService.get('s2s.transport');
        switch (transport) {
          case 'nats':
            return NatsSetupService;
          case 'redis':
            return RedisSetupService;
          case 'rmq':
          default:
            return RabbitMQSetupService;
        }
      },
      inject: [ConfigService],
    },
  ],
  exports: [MessagingService],
})
export class MessagingModule {}
