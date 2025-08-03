import { Test, TestingModule } from '@nestjs/testing';
import { TaskEntityMockFactory } from '@test/mocks';
import { QueueManagerService } from '../queue-manager.service';
import { TaskService } from '../../task/task.service';
import { MessagingService } from '../../core/messaging/messaging.service';
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

    it('should handle enqueue errors', async () => {
      const error = new Error('Database error');
      taskService.createTask.mockRejectedValue(error);

      await expect(
        service.enqueueTask(TaskType.DATA_PROCESSING, { data: 'test' }),
      ).rejects.toThrow('Database error');
    });
  });

  describe('assignTaskToWorker', () => {
    it('should assign task to correct worker', () => {
      const workerName = service.assignTaskToWorker(
        'task-123',
        TaskType.HTTP_REQUEST,
      );
      expect(workerName).toBe('http.worker');
    });
  });

  describe('retryTask', () => {
    it('should retry failed task', async () => {
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
  });

  describe('getQueueStatus', () => {
    it('should return queue status', async () => {
      const pendingTasks = [
        TaskEntityMockFactory.create({ status: TaskStatus.PENDING }),
      ];
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
        pending: 1,
        processing: 1,
        completed: 1,
        failed: 1,
        total: 4,
        isHealthy: true,
      });
    });
  });
});
