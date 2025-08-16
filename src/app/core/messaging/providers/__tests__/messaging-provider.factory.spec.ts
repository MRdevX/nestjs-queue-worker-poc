import { MessagingProviderFactory } from '../messaging-provider.factory';
import { RabbitMQProvider } from '../rabbitmq.provider';
import { NatsProvider } from '../nats.provider';
import {
  createRabbitMQConfig,
  createNatsConfig,
} from '../../__tests__/test-helpers';

jest.mock('../rabbitmq.provider');
jest.mock('../nats.provider');

describe('MessagingProviderFactory', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createProvider', () => {
    it('should create RabbitMQ provider for rmq transport', () => {
      const config = createRabbitMQConfig();

      const provider = MessagingProviderFactory.createProvider(config);

      expect(RabbitMQProvider).toHaveBeenCalledWith(config);
      expect(provider).toBeInstanceOf(RabbitMQProvider);
    });

    it('should create NATS provider for nats transport', () => {
      const config = createNatsConfig();

      const provider = MessagingProviderFactory.createProvider(config);

      expect(NatsProvider).toHaveBeenCalledWith(config);
      expect(provider).toBeInstanceOf(NatsProvider);
    });

    it('should throw error for unsupported transport', () => {
      const config = {
        transport: 'unsupported' as any,
        options: {},
      };

      expect(() => MessagingProviderFactory.createProvider(config)).toThrow(
        'Unsupported transport: unsupported',
      );
    });
  });
});
