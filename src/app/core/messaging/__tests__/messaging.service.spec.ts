import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { ClientProxyFactory } from '@nestjs/microservices';
import { TaskType } from '@root/app/task/types/task-type.enum';
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
  let service: MessagingService;
  let mockClient: jest.Mocked<ClientProxy>;

  beforeEach(async () => {
    mockClient = {
      emit: jest.fn(),
      connect: jest.fn(),
      close: jest.fn(),
    } as any;

    (ClientProxyFactory.create as jest.Mock).mockReturnValue(mockClient);

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

  describe('publishTask', () => {
    it('should publish task successfully', async () => {
      const taskType = TaskType.HTTP_REQUEST;
      const taskId = 'task-123';
      const options = { delay: 1000, metadata: { retry: true } };

      await service.publishTask(taskType, taskId, options);

      expect(mockClient.emit).toHaveBeenCalledWith('http.request', {
        taskId,
        taskType,
        delay: undefined,
        metadata: undefined,
      });
    });

    it('should publish task without options', async () => {
      const taskType = TaskType.DATA_PROCESSING;
      const taskId = 'task-456';

      await service.publishTask(taskType, taskId);

      expect(mockClient.emit).toHaveBeenCalledWith('data.processing', {
        taskId,
        taskType,
        delay: undefined,
        metadata: undefined,
      });
    });
  });

  describe('emitEvent', () => {
    it('should emit event successfully', async () => {
      const pattern = 'custom.event';
      const payload = { data: 'test' };
      const options = { delay: 2000, metadata: { source: 'test' } };

      await service.emitEvent(pattern, payload, options);

      expect(mockClient.emit).toHaveBeenCalledWith(pattern, {
        ...payload,
        delay: 2000,
        metadata: { source: 'test' },
      });
    });

    it('should emit event without options', async () => {
      const pattern = 'simple.event';
      const payload = { message: 'hello' };

      await service.emitEvent(pattern, payload);

      expect(mockClient.emit).toHaveBeenCalledWith(pattern, {
        ...payload,
        delay: undefined,
        metadata: undefined,
      });
    });

    it('should handle emit error', async () => {
      const pattern = 'error.event';
      const payload = { data: 'test' };
      const error = new Error('Emit failed');

      mockClient.emit.mockImplementation(() => {
        throw error;
      });

      await expect(service.emitEvent(pattern, payload)).rejects.toThrow(
        'Emit failed',
      );
    });
  });

  describe('getEventPattern', () => {
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

  describe('onModuleDestroy', () => {
    it('should close client connection on module destroy', async () => {
      await service.onModuleDestroy();

      expect(mockClient.close).toHaveBeenCalled();
    });

    it('should handle close error gracefully', async () => {
      const error = new Error('Close failed');
      mockClient.close.mockRejectedValue(error);

      await service.onModuleDestroy();

      expect(mockClient.close).toHaveBeenCalled();
    });
  });
});
