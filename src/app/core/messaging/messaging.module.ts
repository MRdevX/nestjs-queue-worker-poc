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
    RabbitMQSetupService,
    NatsSetupService,
    RedisSetupService,
    RabbitMQProvider,
    NatsProvider,
    RedisProvider,
    {
      provide: 'ACTIVE_PROVIDER',
      useFactory: (configService: ConfigService) => {
        const transport = configService.get('s2s.transport');
        const config: IMessagingConfig = {
          transport: configService.get('s2s.transport') || 'rmq',
          options: configService.get('s2s.options') || {},
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
      useFactory: (
        configService: ConfigService,
        rabbitMQSetupService: RabbitMQSetupService,
        natsSetupService: NatsSetupService,
        redisSetupService: RedisSetupService,
      ) => {
        const transport = configService.get('s2s.transport');

        switch (transport) {
          case 'nats':
            return natsSetupService;
          case 'redis':
            return redisSetupService;
          case 'rmq':
          default:
            return rabbitMQSetupService;
        }
      },
      inject: [
        ConfigService,
        RabbitMQSetupService,
        NatsSetupService,
        RedisSetupService,
      ],
    },
  ],
  exports: [MessagingService],
})
export class MessagingModule {}
