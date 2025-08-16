import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NatsProvider, RedisProvider, RabbitMQProvider } from '../providers';
import { IMessagingProvider } from '../types/messaging.interface';

@Injectable()
export class MessagingFactoryService {
  constructor(private readonly configService: ConfigService) {}

  createProvider(): IMessagingProvider {
    const s2sConfig = this.configService.get('s2s');
    const transport = s2sConfig?.transport || 'rmq';
    const config = {
      transport,
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
}
