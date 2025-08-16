import { ClientProxy } from '@nestjs/microservices';
import { IMessagingConfig } from '../types/messaging.interface';

export const createMockClient = (): jest.Mocked<ClientProxy> =>
  ({
    connect: jest.fn(),
    close: jest.fn(),
    emit: jest.fn(),
  }) as any;

export const createRabbitMQConfig = (): IMessagingConfig => ({
  transport: 'rmq',
  options: {
    urls: ['amqp://localhost:5672'],
    queue: 'test-queue',
    queueOptions: {
      durable: true,
    },
  },
});

export const createNatsConfig = (): IMessagingConfig => ({
  transport: 'nats',
  options: {
    servers: ['nats://localhost:4222'],
    queue: 'test-queue',
  },
});

export const mockClientProxyFactory = () => {
  const mockClient = createMockClient();
  const { ClientProxyFactory } = require('@nestjs/microservices');
  ClientProxyFactory.create.mockReturnValue(mockClient);
  return mockClient;
};
