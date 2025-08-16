import { Test, TestingModule } from '@nestjs/testing';
import { TaskType } from '@root/app/task/types/task-type.enum';
import { MessagingService } from '../messaging.service';
import { MessagingModuleMockFactory } from '../../../../../test/mocks';

describe('MessagingService', () => {
  let service: MessagingService;
  let mockProvider: any;

  beforeEach(async () => {
    const { providers, mocks } = MessagingModuleMockFactory.createProviders();
    mockProvider = mocks.provider;

    const module: TestingModule = await Test.createTestingModule({
      providers: [MessagingService, ...providers],
    }).compile();

    service = module.get<MessagingService>(MessagingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should create provider and connect on module init', async () => {
      await service.onModuleInit();
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
