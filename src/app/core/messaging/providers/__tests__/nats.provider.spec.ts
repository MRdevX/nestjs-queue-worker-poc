import { Test, TestingModule } from '@nestjs/testing';
import { NatsProvider } from '../nats.provider';
import { IMessagingConfig } from '../../types/messaging.interface';

jest.mock('@nestjs/microservices', () => ({
  ClientProxyFactory: {
    create: jest.fn(),
  },
}));

describe('NatsProvider', () => {
  let provider: NatsProvider;
  let mockClient: jest.Mocked<any>;
  let config: IMessagingConfig;

  const createMockClient = (): jest.Mocked<any> =>
    ({
      connect: jest.fn(),
      close: jest.fn(),
      emit: jest.fn(),
    }) as any;

  const createNatsConfig = (): IMessagingConfig => ({
    transport: 'nats',
    options: {
      servers: ['nats://localhost:4222'],
      queue: 'test-queue',
    },
  });

  beforeEach(async () => {
    mockClient = createMockClient();
    config = createNatsConfig();

    const { ClientProxyFactory } = await import('@nestjs/microservices');
    (ClientProxyFactory.create as jest.Mock).mockReturnValue(mockClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: NatsProvider,
          useFactory: () => new NatsProvider(config),
        },
      ],
    }).compile();

    provider = module.get<NatsProvider>(NatsProvider);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('connect', () => {
    it('should connect successfully', async () => {
      await provider.connect();

      expect(mockClient.connect).toHaveBeenCalled();
      expect(provider.isConnected()).toBe(true);
    });

    it('should handle connection error', async () => {
      const error = new Error('Connection failed');
      mockClient.connect.mockRejectedValue(error);

      await expect(provider.connect()).rejects.toThrow('Connection failed');
      expect(provider.isConnected()).toBe(false);
    });
  });

  describe('disconnect', () => {
    beforeEach(async () => {
      await provider.connect();
    });

    it('should disconnect successfully', async () => {
      await provider.disconnect();

      expect(mockClient.close).toHaveBeenCalled();
      expect(provider.isConnected()).toBe(false);
    });

    it('should handle disconnection error', async () => {
      const error = new Error('Disconnection failed');
      mockClient.close.mockRejectedValue(error);

      await expect(provider.disconnect()).rejects.toThrow(
        'Disconnection failed',
      );
    });
  });

  describe('emit', () => {
    beforeEach(async () => {
      await provider.connect();
    });

    it('should emit message successfully', async () => {
      const pattern = 'test.pattern';
      const payload = { data: 'test' };

      await provider.emit(pattern, payload);

      expect(mockClient.emit).toHaveBeenCalledWith(pattern, payload);
    });

    it('should throw error when not connected', async () => {
      await provider.disconnect();

      await expect(provider.emit('test', {})).rejects.toThrow(
        'NATS client is not connected',
      );
    });

    it('should handle emit error', async () => {
      const error = new Error('Emit failed');
      mockClient.emit.mockImplementation(() => {
        throw error;
      });

      await expect(provider.emit('test', {})).rejects.toThrow('Emit failed');
    });
  });

  describe('isConnected', () => {
    it('should return false when not connected', () => {
      expect(provider.isConnected()).toBe(false);
    });

    it('should return true when connected', async () => {
      await provider.connect();
      expect(provider.isConnected()).toBe(true);
    });
  });
});
