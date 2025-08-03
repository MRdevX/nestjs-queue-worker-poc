import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { ClientProxyFactory } from '@nestjs/microservices';
import { MessagingService } from '../messaging.service';

jest.mock('@nestjs/microservices', () => {
  const actual = jest.requireActual('@nestjs/microservices');
  return {
    ...actual,
    ClientProxyFactory: {
      create: jest.fn(),
    },
  };
});

describe('MessagingService', () => {
  let mockClient: jest.Mocked<ClientProxy>;

  beforeEach(async () => {
    mockClient = {
      send: jest.fn(),
      connect: jest.fn(),
      close: jest.fn(),
    } as any;

    (ClientProxyFactory.create as jest.Mock).mockReturnValue(mockClient);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagingService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue({
              transport: 'rmq',
              options: {
                urls: ['amqp://localhost:5672'],
                queue: 'task-queue',
              },
            }),
          },
        },
      ],
    }).compile();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
});
