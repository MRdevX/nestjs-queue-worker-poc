import { ConfigService } from '@nestjs/config';
import { IMessagingProvider } from '@root/app/core/messaging/types/messaging.interface';

export class MessagingProviderMockFactory {
  static create(): jest.Mocked<IMessagingProvider> {
    return {
      connect: jest.fn(),
      disconnect: jest.fn(),
      emit: jest.fn(),
      isConnected: jest.fn().mockReturnValue(true),
    };
  }

  static createWithDefaults(): jest.Mocked<IMessagingProvider> {
    const mock = this.create();
    mock.connect.mockResolvedValue(undefined);
    mock.disconnect.mockResolvedValue(undefined);
    mock.emit.mockResolvedValue(undefined);
    return mock;
  }
}

export class MessagingSetupServiceMockFactory {
  static create() {
    return {
      setup: jest.fn(),
      getServiceName: jest.fn().mockReturnValue('Mock Setup Service'),
    };
  }

  static createWithDefaults() {
    const mock = this.create();
    mock.setup.mockResolvedValue(undefined);
    return mock;
  }
}

export class ConfigServiceMockFactory {
  static createMessagingConfig(transport: 'rmq' | 'nats' | 'redis' = 'rmq') {
    const baseConfig = {
      transport,
      options: {},
    };

    switch (transport) {
      case 'rmq':
        return {
          ...baseConfig,
          options: {
            urls: ['amqp://localhost:5672'],
            queue: 'task-queue',
            queueOptions: {
              durable: true,
              deadLetterExchange: 'dlx',
              deadLetterRoutingKey: 'failed',
            },
          },
        };
      case 'nats':
        return {
          ...baseConfig,
          options: {
            servers: ['nats://localhost:4222'],
            queue: 'task-queue',
          },
        };
      case 'redis':
        return {
          ...baseConfig,
          options: {
            host: 'localhost',
            port: 6379,
            password: undefined,
            db: 0,
          },
        };
      default:
        return baseConfig;
    }
  }

  static create() {
    return {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 's2s') {
          return this.createMessagingConfig();
        }
        return undefined;
      }),
    };
  }

  static createWithConfig(config: any) {
    return {
      get: jest.fn().mockReturnValue(config),
    };
  }
}

export class MessagingModuleMockFactory {
  static createProviders() {
    const mockProvider = MessagingProviderMockFactory.createWithDefaults();
    const mockSetupService =
      MessagingSetupServiceMockFactory.createWithDefaults();
    const mockConfigService = ConfigServiceMockFactory.create();

    return {
      providers: [
        {
          provide: 'ACTIVE_PROVIDER',
          useValue: mockProvider,
        },
        {
          provide: 'ACTIVE_SETUP_SERVICE',
          useValue: mockSetupService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
      mocks: {
        provider: mockProvider,
        setupService: mockSetupService,
        configService: mockConfigService,
      },
    };
  }
}
