import { Test, TestingModule } from '@nestjs/testing';
import { TaskEntityMockFactory } from '@test/mocks';
import { QueueManagerService } from '../queue-manager.service';
import { TaskService } from '../../task/task.service';
import { TaskStatus } from '../../task/types/task-status.enum';

describe('QueueManagerService', () => {
  let service: QueueManagerService;
  let taskService: jest.Mocked<TaskService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueManagerService,
        {
          provide: TaskService,
          useValue: {
            getPendingTasks: jest.fn(),
            findMany: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<QueueManagerService>(QueueManagerService);
    taskService = module.get(TaskService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getQueueStatus', () => {
    it('should return healthy queue status', async () => {
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

      expect(taskService.getPendingTasks).toHaveBeenCalled();
      expect(taskService.findMany).toHaveBeenCalledWith({
        status: TaskStatus.PROCESSING,
      });
      expect(taskService.findMany).toHaveBeenCalledWith({
        status: TaskStatus.COMPLETED,
      });
      expect(taskService.findMany).toHaveBeenCalledWith({
        status: TaskStatus.FAILED,
      });

      expect(result).toEqual({
        pending: 2,
        processing: 1,
        completed: 3,
        failed: 1,
        total: 7,
        isHealthy: true,
      });
    });

    it('should return unhealthy queue status when too many failed tasks', async () => {
      const pendingTasks = [
        TaskEntityMockFactory.create({ status: TaskStatus.PENDING }),
      ];
      const processingTasks = [];
      const completedTasks = [];
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
        processing: 0,
        completed: 0,
        failed: 60,
        total: 61,
        isHealthy: false,
      });
    });

    it('should return unhealthy queue status when too many pending tasks', async () => {
      const pendingTasks = Array.from({ length: 600 }, () =>
        TaskEntityMockFactory.create({ status: TaskStatus.PENDING }),
      );
      const processingTasks = [];
      const completedTasks = [];
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
        processing: 0,
        completed: 0,
        failed: 1,
        total: 601,
        isHealthy: false,
      });
    });

    it('should handle service errors gracefully', async () => {
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

    it('should handle partial service errors', async () => {
      const pendingTasks = [
        TaskEntityMockFactory.create({ status: TaskStatus.PENDING }),
      ];
      const processingTasks = [
        TaskEntityMockFactory.create({ status: TaskStatus.PROCESSING }),
      ];
      const error = new Error('Database connection failed');

      taskService.getPendingTasks.mockResolvedValue(pendingTasks as any);
      taskService.findMany
        .mockResolvedValueOnce(processingTasks as any)
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error);

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
  });

  describe('isOverloaded', () => {
    it('should return true when pending tasks exceed threshold', async () => {
      const mockStatus = {
        pending: 250,
        processing: 10,
        completed: 100,
        failed: 5,
        total: 365,
        isHealthy: false,
      };

      jest.spyOn(service, 'getQueueStatus').mockResolvedValue(mockStatus);

      const result = await service.isOverloaded();

      expect(service.getQueueStatus).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return true when failed tasks exceed threshold', async () => {
      const mockStatus = {
        pending: 50,
        processing: 10,
        completed: 100,
        failed: 25,
        total: 185,
        isHealthy: false,
      };

      jest.spyOn(service, 'getQueueStatus').mockResolvedValue(mockStatus);

      const result = await service.isOverloaded();

      expect(service.getQueueStatus).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false when both thresholds are within limits', async () => {
      const mockStatus = {
        pending: 150,
        processing: 10,
        completed: 100,
        failed: 15,
        total: 275,
        isHealthy: true,
      };

      jest.spyOn(service, 'getQueueStatus').mockResolvedValue(mockStatus);

      const result = await service.isOverloaded();

      expect(service.getQueueStatus).toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('should return false when exactly at thresholds', async () => {
      const mockStatus = {
        pending: 200,
        processing: 10,
        completed: 100,
        failed: 20,
        total: 330,
        isHealthy: false,
      };

      jest.spyOn(service, 'getQueueStatus').mockResolvedValue(mockStatus);

      const result = await service.isOverloaded();

      expect(service.getQueueStatus).toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });

  describe('getFailedTasksCount', () => {
    it('should return correct count of failed tasks', async () => {
      const failedTasks = [
        TaskEntityMockFactory.create({ status: TaskStatus.FAILED }),
        TaskEntityMockFactory.create({ status: TaskStatus.FAILED }),
        TaskEntityMockFactory.create({ status: TaskStatus.FAILED }),
      ];

      taskService.findMany.mockResolvedValue(failedTasks as any);

      const result = await service.getFailedTasksCount();

      expect(taskService.findMany).toHaveBeenCalledWith({
        status: TaskStatus.FAILED,
      });
      expect(result).toBe(3);
    });

    it('should return zero when no failed tasks', async () => {
      taskService.findMany.mockResolvedValue([]);

      const result = await service.getFailedTasksCount();

      expect(taskService.findMany).toHaveBeenCalledWith({
        status: TaskStatus.FAILED,
      });
      expect(result).toBe(0);
    });

    it('should handle service errors', async () => {
      const error = new Error('Database error');
      taskService.findMany.mockRejectedValue(error);

      await expect(service.getFailedTasksCount()).rejects.toThrow(
        'Database error',
      );

      expect(taskService.findMany).toHaveBeenCalledWith({
        status: TaskStatus.FAILED,
      });
    });
  });

  describe('getPendingTasksCount', () => {
    it('should return correct count of pending tasks', async () => {
      const pendingTasks = [
        TaskEntityMockFactory.create({ status: TaskStatus.PENDING }),
        TaskEntityMockFactory.create({ status: TaskStatus.PENDING }),
        TaskEntityMockFactory.create({ status: TaskStatus.PENDING }),
        TaskEntityMockFactory.create({ status: TaskStatus.PENDING }),
        TaskEntityMockFactory.create({ status: TaskStatus.PENDING }),
      ];

      taskService.getPendingTasks.mockResolvedValue(pendingTasks as any);

      const result = await service.getPendingTasksCount();

      expect(taskService.getPendingTasks).toHaveBeenCalled();
      expect(result).toBe(5);
    });

    it('should return zero when no pending tasks', async () => {
      taskService.getPendingTasks.mockResolvedValue([]);

      const result = await service.getPendingTasksCount();

      expect(taskService.getPendingTasks).toHaveBeenCalled();
      expect(result).toBe(0);
    });

    it('should handle service errors', async () => {
      const error = new Error('Database error');
      taskService.getPendingTasks.mockRejectedValue(error);

      await expect(service.getPendingTasksCount()).rejects.toThrow(
        'Database error',
      );

      expect(taskService.getPendingTasks).toHaveBeenCalled();
    });
  });
});
