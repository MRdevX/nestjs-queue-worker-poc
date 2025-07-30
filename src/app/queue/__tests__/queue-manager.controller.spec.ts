import { Test, TestingModule } from '@nestjs/testing';
import { QueueManagerController } from '../queue-manager.controller';
import { QueueManagerService } from '../queue-manager.service';

describe('QueueManagerController', () => {
  let controller: QueueManagerController;
  let service: jest.Mocked<QueueManagerService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QueueManagerController],
      providers: [
        {
          provide: QueueManagerService,
          useValue: {
            getQueueStatus: jest.fn(),
            isOverloaded: jest.fn(),
            getFailedTasksCount: jest.fn(),
            getPendingTasksCount: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<QueueManagerController>(QueueManagerController);
    service = module.get(QueueManagerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getQueueStatus', () => {
    it('should return queue status', async () => {
      const mockStatus = {
        pending: 10,
        processing: 5,
        completed: 100,
        failed: 2,
        total: 117,
        isHealthy: true,
      };

      service.getQueueStatus.mockResolvedValue(mockStatus);

      const result = await controller.getQueueStatus();

      expect(service.getQueueStatus).toHaveBeenCalled();
      expect(result).toEqual(mockStatus);
    });

    it('should handle service errors', async () => {
      const error = new Error('Service error');
      service.getQueueStatus.mockRejectedValue(error);

      await expect(controller.getQueueStatus()).rejects.toThrow(
        'Service error',
      );

      expect(service.getQueueStatus).toHaveBeenCalled();
    });
  });

  describe('checkOverloaded', () => {
    it('should return overloaded status when queue is overloaded', async () => {
      service.isOverloaded.mockResolvedValue(true);

      const result = await controller.checkOverloaded();

      expect(service.isOverloaded).toHaveBeenCalled();
      expect(result).toEqual({
        isOverloaded: true,
        message: 'Queue is overloaded',
      });
    });

    it('should return normal status when queue is not overloaded', async () => {
      service.isOverloaded.mockResolvedValue(false);

      const result = await controller.checkOverloaded();

      expect(service.isOverloaded).toHaveBeenCalled();
      expect(result).toEqual({
        isOverloaded: false,
        message: 'Queue is operating normally',
      });
    });

    it('should handle service errors', async () => {
      const error = new Error('Service error');
      service.isOverloaded.mockRejectedValue(error);

      await expect(controller.checkOverloaded()).rejects.toThrow(
        'Service error',
      );

      expect(service.isOverloaded).toHaveBeenCalled();
    });
  });

  describe('getFailedTasksCount', () => {
    it('should return failed tasks count', async () => {
      const failedCount = 15;
      service.getFailedTasksCount.mockResolvedValue(failedCount);

      const result = await controller.getFailedTasksCount();

      expect(service.getFailedTasksCount).toHaveBeenCalled();
      expect(result).toEqual({ failedTasks: failedCount });
    });

    it('should return zero when no failed tasks', async () => {
      service.getFailedTasksCount.mockResolvedValue(0);

      const result = await controller.getFailedTasksCount();

      expect(service.getFailedTasksCount).toHaveBeenCalled();
      expect(result).toEqual({ failedTasks: 0 });
    });

    it('should handle service errors', async () => {
      const error = new Error('Service error');
      service.getFailedTasksCount.mockRejectedValue(error);

      await expect(controller.getFailedTasksCount()).rejects.toThrow(
        'Service error',
      );

      expect(service.getFailedTasksCount).toHaveBeenCalled();
    });
  });

  describe('getPendingTasksCount', () => {
    it('should return pending tasks count', async () => {
      const pendingCount = 25;
      service.getPendingTasksCount.mockResolvedValue(pendingCount);

      const result = await controller.getPendingTasksCount();

      expect(service.getPendingTasksCount).toHaveBeenCalled();
      expect(result).toEqual({ pendingTasks: pendingCount });
    });

    it('should return zero when no pending tasks', async () => {
      service.getPendingTasksCount.mockResolvedValue(0);

      const result = await controller.getPendingTasksCount();

      expect(service.getPendingTasksCount).toHaveBeenCalled();
      expect(result).toEqual({ pendingTasks: 0 });
    });

    it('should handle service errors', async () => {
      const error = new Error('Service error');
      service.getPendingTasksCount.mockRejectedValue(error);

      await expect(controller.getPendingTasksCount()).rejects.toThrow(
        'Service error',
      );

      expect(service.getPendingTasksCount).toHaveBeenCalled();
    });
  });
});
