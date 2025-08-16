import { Test, TestingModule } from '@nestjs/testing';
import { TaskEntityMockFactory } from '@test/mocks';
import { QueueManagerService } from '../queue-manager.service';
import { TaskService } from '../../task/task.service';
import { MessagingService } from '../../core/messaging/services/messaging.service';
import { TaskStatus } from '../../task/types/task-status.enum';
import { TaskType } from '../../task/types/task-type.enum';

describe('QueueManagerService', () => {
  let service: QueueManagerService;
  let taskService: jest.Mocked<TaskService>;
  let messagingService: jest.Mocked<MessagingService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueManagerService,
        {
          provide: TaskService,
          useValue: {
            createTask: jest.fn(),
            getTaskById: jest.fn(),
            getPendingTasks: jest.fn(),
            findMany: jest.fn(),
          },
        },
        {
          provide: MessagingService,
          useValue: {
            publishTask: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<QueueManagerService>(QueueManagerService);
    taskService = module.get(TaskService);
    messagingService = module.get(MessagingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('enqueueTask', () => {
    it('should enqueue a task successfully', async () => {
      const mockTask = TaskEntityMockFactory.create({
        id: 'task-123',
        type: TaskType.HTTP_REQUEST,
        status: TaskStatus.PENDING,
      });

      taskService.createTask.mockResolvedValue(mockTask as any);
      messagingService.publishTask.mockResolvedValue(undefined);

      const result = await service.enqueueTask(
        TaskType.HTTP_REQUEST,
        { url: 'https://api.example.com' },
        'workflow-123',
      );

      expect(taskService.createTask).toHaveBeenCalledWith(
        TaskType.HTTP_REQUEST,
        { url: 'https://api.example.com' },
        'workflow-123',
      );

      expect(messagingService.publishTask).toHaveBeenCalledWith(
        TaskType.HTTP_REQUEST,
        'task-123',
        {
          metadata: {
            workflowId: 'workflow-123',
            createdAt: expect.any(String),
          },
        },
      );

      expect(result).toBe('task-123');
    });

    it('should enqueue a task without workflowId', async () => {
      const mockTask = TaskEntityMockFactory.create({
        id: 'task-456',
        type: TaskType.DATA_PROCESSING,
        status: TaskStatus.PENDING,
      });

      taskService.createTask.mockResolvedValue(mockTask as any);
      messagingService.publishTask.mockResolvedValue(undefined);

      const result = await service.enqueueTask(TaskType.DATA_PROCESSING, {
        data: 'test-data',
      });

      expect(taskService.createTask).toHaveBeenCalledWith(
        TaskType.DATA_PROCESSING,
        { data: 'test-data' },
        undefined,
      );

      expect(messagingService.publishTask).toHaveBeenCalledWith(
        TaskType.DATA_PROCESSING,
        'task-456',
        {
          metadata: {
            workflowId: undefined,
            createdAt: expect.any(String),
          },
        },
      );

      expect(result).toBe('task-456');
    });

    it('should handle task creation errors', async () => {
      const error = new Error('Database error');
      taskService.createTask.mockRejectedValue(error);

      await expect(
        service.enqueueTask(TaskType.DATA_PROCESSING, { data: 'test' }),
      ).rejects.toThrow('Database error');

      expect(taskService.createTask).toHaveBeenCalledWith(
        TaskType.DATA_PROCESSING,
        { data: 'test' },
        undefined,
      );
      expect(messagingService.publishTask).not.toHaveBeenCalled();
    });

    it('should handle messaging service errors', async () => {
      const mockTask = TaskEntityMockFactory.create({
        id: 'task-123',
        type: TaskType.HTTP_REQUEST,
        status: TaskStatus.PENDING,
      });

      taskService.createTask.mockResolvedValue(mockTask as any);
      const error = new Error('Messaging service unavailable');
      messagingService.publishTask.mockRejectedValue(error);

      await expect(
        service.enqueueTask(TaskType.HTTP_REQUEST, {
          url: 'https://api.example.com',
        }),
      ).rejects.toThrow('Messaging service unavailable');

      expect(taskService.createTask).toHaveBeenCalled();
      expect(messagingService.publishTask).toHaveBeenCalled();
    });

    it('should handle complex payload data', async () => {
      const complexPayload = {
        url: 'https://api.example.com',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { key: 'value', nested: { data: 'test' } },
        timeout: 5000,
      };

      const mockTask = TaskEntityMockFactory.create({
        id: 'task-789',
        type: TaskType.HTTP_REQUEST,
        status: TaskStatus.PENDING,
      });

      taskService.createTask.mockResolvedValue(mockTask as any);
      messagingService.publishTask.mockResolvedValue(undefined);

      const result = await service.enqueueTask(
        TaskType.HTTP_REQUEST,
        complexPayload,
        'workflow-456',
      );

      expect(taskService.createTask).toHaveBeenCalledWith(
        TaskType.HTTP_REQUEST,
        complexPayload,
        'workflow-456',
      );

      expect(result).toBe('task-789');
    });
  });

  describe('retryTask', () => {
    it('should retry failed task successfully', async () => {
      const mockTask = TaskEntityMockFactory.create({
        id: 'task-123',
        type: TaskType.HTTP_REQUEST,
        retries: 1,
        maxRetries: 3,
      });

      taskService.getTaskById.mockResolvedValue(mockTask as any);
      messagingService.publishTask.mockResolvedValue(undefined);

      await service.retryTask('task-123');

      expect(taskService.getTaskById).toHaveBeenCalledWith('task-123');
      expect(messagingService.publishTask).toHaveBeenCalledWith(
        TaskType.HTTP_REQUEST,
        'task-123',
        {
          metadata: {
            retryCount: 2,
            originalTaskId: 'task-123',
          },
        },
      );
    });

    it('should not retry if max retries exceeded', async () => {
      const mockTask = TaskEntityMockFactory.create({
        id: 'task-123',
        type: TaskType.HTTP_REQUEST,
        retries: 3,
        maxRetries: 3,
      });

      taskService.getTaskById.mockResolvedValue(mockTask as any);

      await service.retryTask('task-123');

      expect(taskService.getTaskById).toHaveBeenCalledWith('task-123');
      expect(messagingService.publishTask).not.toHaveBeenCalled();
    });

    it('should not retry if task has reached max retries exactly', async () => {
      const mockTask = TaskEntityMockFactory.create({
        id: 'task-456',
        type: TaskType.DATA_PROCESSING,
        retries: 3,
        maxRetries: 3,
      });

      taskService.getTaskById.mockResolvedValue(mockTask as any);

      await service.retryTask('task-456');

      expect(taskService.getTaskById).toHaveBeenCalledWith('task-456');
      expect(messagingService.publishTask).not.toHaveBeenCalled();
    });

    it('should handle task not found error', async () => {
      taskService.getTaskById.mockResolvedValue(null);

      await expect(service.retryTask('non-existent-task')).rejects.toThrow(
        'Task non-existent-task not found',
      );

      expect(taskService.getTaskById).toHaveBeenCalledWith('non-existent-task');
      expect(messagingService.publishTask).not.toHaveBeenCalled();
    });

    it('should handle messaging service errors during retry', async () => {
      const mockTask = TaskEntityMockFactory.create({
        id: 'task-123',
        type: TaskType.HTTP_REQUEST,
        retries: 1,
        maxRetries: 3,
      });

      taskService.getTaskById.mockResolvedValue(mockTask as any);
      const error = new Error('Messaging service error');
      messagingService.publishTask.mockRejectedValue(error);

      await expect(service.retryTask('task-123')).rejects.toThrow(
        'Messaging service error',
      );

      expect(taskService.getTaskById).toHaveBeenCalledWith('task-123');
      expect(messagingService.publishTask).toHaveBeenCalled();
    });

    it('should handle retry with zero retries', async () => {
      const mockTask = TaskEntityMockFactory.create({
        id: 'task-789',
        type: TaskType.COMPENSATION,
        retries: 0,
        maxRetries: 3,
      });

      taskService.getTaskById.mockResolvedValue(mockTask as any);
      messagingService.publishTask.mockResolvedValue(undefined);

      await service.retryTask('task-789');

      expect(taskService.getTaskById).toHaveBeenCalledWith('task-789');
      expect(messagingService.publishTask).toHaveBeenCalledWith(
        TaskType.COMPENSATION,
        'task-789',
        {
          metadata: {
            retryCount: 1,
            originalTaskId: 'task-789',
          },
        },
      );
    });
  });

  describe('getQueueStatus', () => {
    it('should return queue status successfully', async () => {
      const pendingTasks = [
        TaskEntityMockFactory.create({ status: TaskStatus.PENDING }),
        TaskEntityMockFactory.create({ status: TaskStatus.PENDING }),
      ];
      const processingTasks = [
        TaskEntityMockFactory.create({ status: TaskStatus.PROCESSING }),
      ];
      const completedTasks = [
        TaskEntityMockFactory.create({ status: TaskStatus.COMPLETED }),
        TaskEntityMockFactory.create({ status: TaskStatus.COMPLETED }),
        TaskEntityMockFactory.create({ status: TaskStatus.COMPLETED }),
      ];
      const failedTasks = [
        TaskEntityMockFactory.create({ status: TaskStatus.FAILED }),
      ];

      taskService.getPendingTasks.mockResolvedValue(pendingTasks as any);
      taskService.findMany
        .mockResolvedValueOnce(processingTasks as any)
        .mockResolvedValueOnce(completedTasks as any)
        .mockResolvedValueOnce(failedTasks as any);

      const result = await service.getQueueStatus();

      expect(result).toEqual({
        pending: 2,
        processing: 1,
        completed: 3,
        failed: 1,
        total: 7,
        isHealthy: true,
      });
    });

    it('should return unhealthy status when failed tasks exceed threshold', async () => {
      const pendingTasks = [
        TaskEntityMockFactory.create({ status: TaskStatus.PENDING }),
      ];
      const processingTasks = [
        TaskEntityMockFactory.create({ status: TaskStatus.PROCESSING }),
      ];
      const completedTasks = [
        TaskEntityMockFactory.create({ status: TaskStatus.COMPLETED }),
      ];
      const failedTasks = Array.from({ length: 60 }, () =>
        TaskEntityMockFactory.create({ status: TaskStatus.FAILED }),
      );

      taskService.getPendingTasks.mockResolvedValue(pendingTasks as any);
      taskService.findMany
        .mockResolvedValueOnce(processingTasks as any)
        .mockResolvedValueOnce(completedTasks as any)
        .mockResolvedValueOnce(failedTasks as any);

      const result = await service.getQueueStatus();

      expect(result).toEqual({
        pending: 1,
        processing: 1,
        completed: 1,
        failed: 60,
        total: 63,
        isHealthy: false,
      });
    });

    it('should return unhealthy status when pending tasks exceed threshold', async () => {
      const pendingTasks = Array.from({ length: 600 }, () =>
        TaskEntityMockFactory.create({ status: TaskStatus.PENDING }),
      );
      const processingTasks = [
        TaskEntityMockFactory.create({ status: TaskStatus.PROCESSING }),
      ];
      const completedTasks = [
        TaskEntityMockFactory.create({ status: TaskStatus.COMPLETED }),
      ];
      const failedTasks = [
        TaskEntityMockFactory.create({ status: TaskStatus.FAILED }),
      ];

      taskService.getPendingTasks.mockResolvedValue(pendingTasks as any);
      taskService.findMany
        .mockResolvedValueOnce(processingTasks as any)
        .mockResolvedValueOnce(completedTasks as any)
        .mockResolvedValueOnce(failedTasks as any);

      const result = await service.getQueueStatus();

      expect(result).toEqual({
        pending: 600,
        processing: 1,
        completed: 1,
        failed: 1,
        total: 603,
        isHealthy: false,
      });
    });

    it('should handle empty queue status', async () => {
      taskService.getPendingTasks.mockResolvedValue([]);
      taskService.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.getQueueStatus();

      expect(result).toEqual({
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        total: 0,
        isHealthy: true,
      });
    });

    it('should handle database errors gracefully', async () => {
      const error = new Error('Database connection failed');
      taskService.getPendingTasks.mockRejectedValue(error);

      const result = await service.getQueueStatus();

      expect(result).toEqual({
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        total: 0,
        isHealthy: false,
      });
    });

    it('should handle partial database errors', async () => {
      const pendingTasks = [
        TaskEntityMockFactory.create({ status: TaskStatus.PENDING }),
      ];
      const error = new Error('Database error');

      taskService.getPendingTasks.mockResolvedValue(pendingTasks as any);
      taskService.findMany
        .mockResolvedValueOnce([])
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce([]);

      const result = await service.getQueueStatus();

      expect(result).toEqual({
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        total: 0,
        isHealthy: false,
      });
    });

    it('should handle large task counts correctly', async () => {
      const pendingTasks = Array.from({ length: 1000 }, () =>
        TaskEntityMockFactory.create({ status: TaskStatus.PENDING }),
      );
      const processingTasks = Array.from({ length: 100 }, () =>
        TaskEntityMockFactory.create({ status: TaskStatus.PROCESSING }),
      );
      const completedTasks = Array.from({ length: 5000 }, () =>
        TaskEntityMockFactory.create({ status: TaskStatus.COMPLETED }),
      );
      const failedTasks = Array.from({ length: 10 }, () =>
        TaskEntityMockFactory.create({ status: TaskStatus.FAILED }),
      );

      taskService.getPendingTasks.mockResolvedValue(pendingTasks as any);
      taskService.findMany
        .mockResolvedValueOnce(processingTasks as any)
        .mockResolvedValueOnce(completedTasks as any)
        .mockResolvedValueOnce(failedTasks as any);

      const result = await service.getQueueStatus();

      expect(result).toEqual({
        pending: 1000,
        processing: 100,
        completed: 5000,
        failed: 10,
        total: 6110,
        isHealthy: false,
      });
    });
  });
});
