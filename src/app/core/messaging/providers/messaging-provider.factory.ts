import {
  IMessagingProvider,
  IMessagingConfig,
} from '../types/messaging.interface';
import { RabbitMQProvider } from './rabbitmq.provider';
import { NatsProvider } from './nats.provider';

export class MessagingProviderFactory {
  static createProvider(config: IMessagingConfig): IMessagingProvider {
    switch (config.transport) {
      case 'rmq':
        return new RabbitMQProvider(config);
      case 'nats':
        return new NatsProvider(config);
      default:
        throw new Error(`Unsupported transport: ${config.transport}`);
    }
  }
}
