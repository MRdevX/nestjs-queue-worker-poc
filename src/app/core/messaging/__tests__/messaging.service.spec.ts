import { firstValueFrom, of, throwError } from 'rxjs';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { ClientProxyFactory } from '@nestjs/microservices';
import { MessagingService } from '../messaging.service';
import { TaskType } from '../../../task/types/task-type.enum';
import { ITaskMessage } from '../types/task-message.interface';

jest.mock('rxjs', () => ({
  ...jest.requireActual('rxjs'),
  firstValueFrom: jest.fn(),
}));

const mockFirstValueFrom = firstValueFrom as jest.MockedFunction<
  typeof firstValueFrom
>;

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
  let configService: jest.Mocked<ConfigService>;
  let mockClient: jest.Mocked<ClientProxy>;

  beforeEach(async () => {
    mockClient = {
      send: jest.fn(),
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
              },
            }),
          },
        },
      ],
    }).compile();

    service = module.get<MessagingService>(MessagingService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getClient', () => {
    it('should return the client instance', () => {
      const client = service.getClient();
      expect(client).toBeDefined();
    });
  });

  describe('getMessagePattern', () => {
    it('should return correct pattern for HTTP_REQUEST', () => {
      const pattern = (service as any).getMessagePattern(TaskType.HTTP_REQUEST);
      expect(pattern).toBe('http.request');
    });

    it('should return correct pattern for DATA_PROCESSING', () => {
      const pattern = (service as any).getMessagePattern(
        TaskType.DATA_PROCESSING,
      );
      expect(pattern).toBe('data.processing');
    });

    it('should return correct pattern for COMPENSATION', () => {
      const pattern = (service as any).getMessagePattern(TaskType.COMPENSATION);
      expect(pattern).toBe('compensation');
    });

    it('should return default pattern for unknown task type', () => {
      const pattern = (service as any).getMessagePattern(
        'UNKNOWN_TYPE' as TaskType,
      );
      expect(pattern).toBe('task.created');
    });
  });

  describe('publishTask', () => {
    it('should publish task successfully without options', async () => {
      const taskType = TaskType.HTTP_REQUEST;
      const taskId = 'task-123';
      const expectedMessage: ITaskMessage = {
        taskId,
        taskType,
        delay: undefined,
        metadata: undefined,
      };

      mockClient.send.mockReturnValue(of({}));
      mockFirstValueFrom.mockResolvedValue({});

      await service.publishTask(taskType, taskId);

      expect(mockClient.send).toHaveBeenCalledWith(
        'http.request',
        expectedMessage,
      );
      expect(mockFirstValueFrom).toHaveBeenCalled();
    });

    it('should publish task successfully with delay', async () => {
      const taskType = TaskType.DATA_PROCESSING;
      const taskId = 'task-456';
      const delay = 5000;
      const expectedMessage: ITaskMessage = {
        taskId,
        taskType,
        delay,
        metadata: undefined,
      };

      mockClient.send.mockReturnValue(of({}));
      mockFirstValueFrom.mockResolvedValue({});

      await service.publishTask(taskType, taskId, { delay });

      expect(mockClient.send).toHaveBeenCalledWith(
        'data.processing',
        expectedMessage,
      );
      expect(mockFirstValueFrom).toHaveBeenCalled();
    });

    it('should publish task successfully with metadata', async () => {
      const taskType = TaskType.COMPENSATION;
      const taskId = 'task-789';
      const metadata = { retryCount: 3, isRetry: true };
      const expectedMessage: ITaskMessage = {
        taskId,
        taskType,
        delay: undefined,
        metadata,
      };

      mockClient.send.mockReturnValue(of({}));
      mockFirstValueFrom.mockResolvedValue({});

      await service.publishTask(taskType, taskId, { metadata });

      expect(mockClient.send).toHaveBeenCalledWith(
        'compensation',
        expectedMessage,
      );
      expect(mockFirstValueFrom).toHaveBeenCalled();
    });

    it('should publish task successfully with both delay and metadata', async () => {
      const taskType = TaskType.HTTP_REQUEST;
      const taskId = 'task-999';
      const delay = 2000;
      const metadata = { priority: 'high', source: 'api' };
      const expectedMessage: ITaskMessage = {
        taskId,
        taskType,
        delay,
        metadata,
      };

      mockClient.send.mockReturnValue(of({}));
      mockFirstValueFrom.mockResolvedValue({});

      await service.publishTask(taskType, taskId, { delay, metadata });

      expect(mockClient.send).toHaveBeenCalledWith(
        'http.request',
        expectedMessage,
      );
      expect(mockFirstValueFrom).toHaveBeenCalled();
    });

    it('should handle client send error', async () => {
      const taskType = TaskType.HTTP_REQUEST;
      const taskId = 'task-123';
      const error = new Error('Connection failed');

      mockClient.send.mockReturnValue(throwError(() => error));
      mockFirstValueFrom.mockRejectedValue(error);

      await expect(service.publishTask(taskType, taskId)).rejects.toThrow(
        'Failed to publish task: Connection failed',
      );

      expect(mockClient.send).toHaveBeenCalledWith('http.request', {
        taskId,
        taskType,
        delay: undefined,
        metadata: undefined,
      });
      expect(mockFirstValueFrom).toHaveBeenCalled();
    });

    it('should handle unknown error', async () => {
      const taskType = TaskType.DATA_PROCESSING;
      const taskId = 'task-456';
      const error = { message: undefined, name: 'UnknownError' };

      mockClient.send.mockReturnValue(throwError(() => error));
      mockFirstValueFrom.mockRejectedValue(error);

      await expect(service.publishTask(taskType, taskId)).rejects.toThrow(
        'Failed to publish task: Unknown error',
      );

      expect(mockClient.send).toHaveBeenCalledWith('data.processing', {
        taskId,
        taskType,
        delay: undefined,
        metadata: undefined,
      });
      expect(mockFirstValueFrom).toHaveBeenCalled();
    });

    it('should handle unknown task type', async () => {
      const taskType = 'UNKNOWN_TYPE' as TaskType;
      const taskId = 'task-123';
      const expectedMessage: ITaskMessage = {
        taskId,
        taskType,
        delay: undefined,
        metadata: undefined,
      };

      mockClient.send.mockReturnValue(of({}));
      mockFirstValueFrom.mockResolvedValue({});

      await service.publishTask(taskType, taskId);

      expect(mockClient.send).toHaveBeenCalledWith(
        'task.created',
        expectedMessage,
      );
      expect(mockFirstValueFrom).toHaveBeenCalled();
    });
  });

  describe('connect', () => {
    it('should connect successfully', async () => {
      mockClient.connect.mockResolvedValue(undefined);

      await service.connect();

      expect(mockClient.connect).toHaveBeenCalled();
    });

    it('should handle connection error', async () => {
      const error = new Error('Connection refused');
      mockClient.connect.mockRejectedValue(error);

      await expect(service.connect()).rejects.toThrow(
        'Failed to connect to RabbitMQ: Connection refused',
      );

      expect(mockClient.connect).toHaveBeenCalled();
    });

    it('should handle connection error without message', async () => {
      const error = { message: undefined };
      mockClient.connect.mockRejectedValue(error);

      await expect(service.connect()).rejects.toThrow(
        'Failed to connect to RabbitMQ: undefined',
      );

      expect(mockClient.connect).toHaveBeenCalled();
    });
  });

  describe('close', () => {
    it('should close connection successfully', async () => {
      mockClient.close.mockResolvedValue(undefined);

      await service.close();

      expect(mockClient.close).toHaveBeenCalled();
    });

    it('should handle close error gracefully', async () => {
      const error = new Error('Close failed');
      mockClient.close.mockRejectedValue(error);

      await expect(service.close()).resolves.toBeUndefined();

      expect(mockClient.close).toHaveBeenCalled();
    });
  });

  describe('onModuleDestroy', () => {
    it('should call close method', async () => {
      mockClient.close.mockResolvedValue(undefined);

      await service.onModuleDestroy();

      expect(mockClient.close).toHaveBeenCalled();
    });

    it('should handle close error in onModuleDestroy', async () => {
      const error = new Error('Close failed');
      mockClient.close.mockRejectedValue(error);

      await expect(service.onModuleDestroy()).resolves.toBeUndefined();

      expect(mockClient.close).toHaveBeenCalled();
    });
  });

  describe('createClient', () => {
    it('should create client with correct configuration', () => {
      const s2sConfig = {
        transport: 'rmq',
        options: {
          urls: ['amqp://localhost:5672'],
          queue: 'task-queue',
        },
      };

      configService.get.mockReturnValue(s2sConfig);

      new MessagingService(configService);

      expect(configService.get).toHaveBeenCalledWith('s2s');
    });

    it('should throw a clear error if configuration is missing', () => {
      configService.get.mockReturnValue(undefined);

      expect(() => new MessagingService(configService)).toThrow(
        /Cannot read properties of undefined/,
      );
    });
  });
});
