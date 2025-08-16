import { Test, TestingModule } from '@nestjs/testing';
import { TaskEntityMockFactory } from '@test/mocks';
import { QueueManagerService } from '../queue-manager.service';
import { TaskService } from '../../task/task.service';
import { TaskQueueService } from '../task-queue.service';
import { MessagingService } from '../../core/messaging/services/messaging.service';
import { TaskStatus } from '../../task/types/task-status.enum';
import { TaskType } from '../../task/types/task-type.enum';

describe('QueueManagerService', () => {
  let service: QueueManagerService;
  let taskService: jest.Mocked<TaskService>;
  let taskQueueService: jest.Mocked<TaskQueueService>;

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
          provide: TaskQueueService,
          useValue: {
            enqueueTask: jest.fn(),
            retryTask: jest.fn(),
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
    taskQueueService = module.get(TaskQueueService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('enqueueTask', () => {
    it('should enqueue a task successfully', async () => {
      const mockTaskId = 'task-123';
      taskQueueService.enqueueTask.mockResolvedValue(mockTaskId);

      const result = await service.enqueueTask(
        TaskType.HTTP_REQUEST,
        { url: 'https://api.example.com' },
        'workflow-123',
      );

      expect(taskQueueService.enqueueTask).toHaveBeenCalledWith(
        TaskType.HTTP_REQUEST,
        { url: 'https://api.example.com' },
        'workflow-123',
      );

      expect(result).toBe(mockTaskId);
    });

    it('should enqueue a task without workflowId', async () => {
      const mockTaskId = 'task-456';
      taskQueueService.enqueueTask.mockResolvedValue(mockTaskId);

      const result = await service.enqueueTask(TaskType.DATA_PROCESSING, {
        data: 'test-data',
      });

      expect(taskQueueService.enqueueTask).toHaveBeenCalledWith(
        TaskType.DATA_PROCESSING,
        { data: 'test-data' },
        undefined,
      );

      expect(result).toBe(mockTaskId);
    });

    it('should handle task creation errors', async () => {
      const error = new Error('Task creation failed');
      taskQueueService.enqueueTask.mockRejectedValue(error);

      await expect(
        service.enqueueTask(TaskType.HTTP_REQUEST, {
          url: 'https://api.example.com',
        }),
      ).rejects.toThrow('Task creation failed');

      expect(taskQueueService.enqueueTask).toHaveBeenCalledWith(
        TaskType.HTTP_REQUEST,
        { url: 'https://api.example.com' },
        undefined,
      );
    });

    it('should handle messaging service errors', async () => {
      const error = new Error('Messaging service unavailable');
      taskQueueService.enqueueTask.mockRejectedValue(error);

      await expect(
        service.enqueueTask(TaskType.HTTP_REQUEST, {
          url: 'https://api.example.com',
        }),
      ).rejects.toThrow('Messaging service unavailable');

      expect(taskQueueService.enqueueTask).toHaveBeenCalledWith(
        TaskType.HTTP_REQUEST,
        { url: 'https://api.example.com' },
        undefined,
      );
    });

    it('should handle complex payload data', async () => {
      const mockTaskId = 'task-789';
      const complexPayload = {
        url: 'https://api.example.com',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { data: 'complex-data', nested: { value: 123 } },
      };

      taskQueueService.enqueueTask.mockResolvedValue(mockTaskId);

      const result = await service.enqueueTask(
        TaskType.HTTP_REQUEST,
        complexPayload,
        'workflow-456',
      );

      expect(taskQueueService.enqueueTask).toHaveBeenCalledWith(
        TaskType.HTTP_REQUEST,
        complexPayload,
        'workflow-456',
      );

      expect(result).toBe(mockTaskId);
    });
  });

  describe('retryTask', () => {
    it('should retry failed task successfully', async () => {
      const taskId = 'failed-task-123';
      taskQueueService.retryTask.mockResolvedValue();

      await service.retryTask(taskId);

      expect(taskQueueService.retryTask).toHaveBeenCalledWith(taskId);
    });

    it('should not retry if max retries exceeded', async () => {
      const taskId = 'max-retries-task';
      taskQueueService.retryTask.mockResolvedValue();

      await service.retryTask(taskId);

      expect(taskQueueService.retryTask).toHaveBeenCalledWith(taskId);
    });

    it('should not retry if task has reached max retries exactly', async () => {
      const taskId = 'exact-max-retries-task';
      taskQueueService.retryTask.mockResolvedValue();

      await service.retryTask(taskId);

      expect(taskQueueService.retryTask).toHaveBeenCalledWith(taskId);
    });

    it('should handle task not found error', async () => {
      const taskId = 'non-existent-task';
      const error = new Error('Task not found');
      taskQueueService.retryTask.mockRejectedValue(error);

      await expect(service.retryTask(taskId)).rejects.toThrow('Task not found');

      expect(taskQueueService.retryTask).toHaveBeenCalledWith(taskId);
    });

    it('should handle messaging service errors during retry', async () => {
      const taskId = 'retry-task-123';
      const error = new Error('Messaging service error');
      taskQueueService.retryTask.mockRejectedValue(error);

      await expect(service.retryTask(taskId)).rejects.toThrow(
        'Messaging service error',
      );

      expect(taskQueueService.retryTask).toHaveBeenCalledWith(taskId);
    });

    it('should handle retry with zero retries', async () => {
      const taskId = 'zero-retries-task';
      taskQueueService.retryTask.mockResolvedValue();

      await service.retryTask(taskId);

      expect(taskQueueService.retryTask).toHaveBeenCalledWith(taskId);
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
