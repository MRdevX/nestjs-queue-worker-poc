import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TaskType } from '@root/app/task/types/task-type.enum';
import { MessagingService } from '../messaging.service';
import { IMessagingProvider } from '../types/messaging.interface';
import { MessagingProviderFactory } from '../providers/messaging-provider.factory';

jest.mock('../providers/messaging-provider.factory');

describe('MessagingService', () => {
  let service: MessagingService;
  let mockProvider: jest.Mocked<IMessagingProvider>;

  beforeEach(async () => {
    mockProvider = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      emit: jest.fn(),
      isConnected: jest.fn().mockReturnValue(true),
    };

    (MessagingProviderFactory.createProvider as jest.Mock).mockReturnValue(
      mockProvider,
    );

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
                queueOptions: {
                  durable: true,
                  deadLetterExchange: 'dlx',
                  deadLetterRoutingKey: 'failed',
                },
              },
            }),
          },
        },
      ],
    }).compile();

    service = module.get<MessagingService>(MessagingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should create provider and connect on module init', async () => {
      await service.onModuleInit();

      expect(MessagingProviderFactory.createProvider).toHaveBeenCalledWith({
        transport: 'rmq',
        options: {
          urls: ['amqp://localhost:5672'],
          queue: 'task-queue',
          queueOptions: {
            durable: true,
            deadLetterExchange: 'dlx',
            deadLetterRoutingKey: 'failed',
          },
        },
      });
      expect(mockProvider.connect).toHaveBeenCalled();
    });
  });

  describe('publishTask', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should publish task successfully', async () => {
      const taskType = TaskType.HTTP_REQUEST;
      const taskId = 'task-123';
      const options = { delay: 1000, metadata: { retry: true } };

      await service.publishTask(taskType, taskId, options);

      expect(mockProvider.emit).toHaveBeenCalledWith('http.request', {
        taskId,
        taskType,
        delay: 1000,
        metadata: { retry: true },
      });
    });

    it('should publish task without options', async () => {
      const taskType = TaskType.DATA_PROCESSING;
      const taskId = 'task-456';

      await service.publishTask(taskType, taskId);

      expect(mockProvider.emit).toHaveBeenCalledWith('data.processing', {
        taskId,
        taskType,
        delay: undefined,
        metadata: undefined,
      });
    });
  });

  describe('emitEvent', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should emit event successfully', async () => {
      const pattern = 'custom.event';
      const payload = { data: 'test' };
      const options = { delay: 2000, metadata: { source: 'test' } };

      await service.emitEvent(pattern, payload, options);

      expect(mockProvider.emit).toHaveBeenCalledWith(pattern, {
        ...payload,
        delay: 2000,
        metadata: { source: 'test' },
      });
    });

    it('should emit event without options', async () => {
      const pattern = 'simple.event';
      const payload = { message: 'hello' };

      await service.emitEvent(pattern, payload);

      expect(mockProvider.emit).toHaveBeenCalledWith(pattern, {
        ...payload,
        delay: undefined,
        metadata: undefined,
      });
    });
  });

  describe('getEventPattern', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should return correct pattern for HTTP_REQUEST', () => {
      const pattern = (service as any).getEventPattern(TaskType.HTTP_REQUEST);
      expect(pattern).toBe('http.request');
    });

    it('should return correct pattern for DATA_PROCESSING', () => {
      const pattern = (service as any).getEventPattern(
        TaskType.DATA_PROCESSING,
      );
      expect(pattern).toBe('data.processing');
    });

    it('should return correct pattern for FETCH_ORDERS', () => {
      const pattern = (service as any).getEventPattern(TaskType.FETCH_ORDERS);
      expect(pattern).toBe('fetch.orders');
    });

    it('should return default pattern for unknown task type', () => {
      const pattern = (service as any).getEventPattern(
        'UNKNOWN_TYPE' as TaskType,
      );
      expect(pattern).toBe('task.created');
    });
  });

  describe('connection management', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should connect to provider', async () => {
      await service.connect();
      expect(mockProvider.connect).toHaveBeenCalled();
    });

    it('should disconnect from provider', async () => {
      await service.disconnect();
      expect(mockProvider.disconnect).toHaveBeenCalled();
    });

    it('should check connection status', () => {
      const isConnected = service.isConnected();
      expect(mockProvider.isConnected).toHaveBeenCalled();
      expect(isConnected).toBe(true);
    });
  });

  describe('onModuleDestroy', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should disconnect on module destroy', async () => {
      await service.onModuleDestroy();
      expect(mockProvider.disconnect).toHaveBeenCalled();
    });
  });
});
