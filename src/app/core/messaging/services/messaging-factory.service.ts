import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NatsProvider, RedisProvider, RabbitMQProvider } from '../providers';
import {
  IMessagingProvider,
  IMessagingSetupService,
} from '../types/messaging.interface';
import { NatsSetupService } from './nats-setup.service';
import { RabbitMQSetupService } from './rabbitmq-setup.service';
import { RedisSetupService } from './redis-setup.service';

@Injectable()
export class MessagingFactoryService {
  constructor(private readonly configService: ConfigService) {}

  createProvider(): IMessagingProvider {
    const s2sConfig = this.configService.get('s2s');
    const transport = s2sConfig?.transport || 'rmq';
    const config = {
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
  }

  createSetupService(): IMessagingSetupService {
    const s2sConfig = this.configService.get('s2s');
    const transport = s2sConfig?.transport || 'rmq';

    switch (transport) {
      case 'nats':
        return new NatsSetupService(this.configService);
      case 'redis':
        return new RedisSetupService(this.configService);
      case 'rmq':
      default:
        return new RabbitMQSetupService(this.configService);
    }
  }
}
