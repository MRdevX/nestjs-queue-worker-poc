import { Test, TestingModule } from '@nestjs/testing';
import { TaskEntityMockFactory } from '@test/mocks';
import { QueueController } from '../queue.controller';
import { TaskService } from '../task.service';
import { MessagingService } from '../../core/messaging/messaging.service';
import { TaskType } from '../types/task-type.enum';
import { TaskStatus } from '../types/task-status.enum';

describe('QueueController', () => {
  let controller: QueueController;
  let taskService: jest.Mocked<TaskService>;
  let messagingService: jest.Mocked<MessagingService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QueueController],
      providers: [
        {
          provide: TaskService,
          useValue: {
            getPendingTasks: jest.fn(),
            findMany: jest.fn(),
            getTaskById: jest.fn(),
            updateTaskStatus: jest.fn(),
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

    controller = module.get<QueueController>(QueueController);
    taskService = module.get(TaskService);
    messagingService = module.get(MessagingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getQueueStatus', () => {
    it('should return queue status with all task counts', async () => {
      const pendingTasks = TaskEntityMockFactory.createArray(3, {
        status: TaskStatus.PENDING,
      });
      const processingTasks = TaskEntityMockFactory.createArray(2, {
        status: TaskStatus.PROCESSING,
      });
      const failedTasks = TaskEntityMockFactory.createArray(1, {
        status: TaskStatus.FAILED,
      });

      taskService.getPendingTasks.mockResolvedValue(pendingTasks as any);
      taskService.findMany
        .mockResolvedValueOnce(processingTasks as any)
        .mockResolvedValueOnce(failedTasks as any);

      const result = await controller.getQueueStatus();

      expect(taskService.getPendingTasks).toHaveBeenCalled();
      expect(taskService.findMany).toHaveBeenCalledWith({
        status: TaskStatus.PROCESSING,
      });
      expect(taskService.findMany).toHaveBeenCalledWith({
        status: TaskStatus.FAILED,
      });
      expect(result).toEqual({
        pending: 3,
        processing: 2,
        failed: 1,
        total: 6,
      });
    });

    it('should return zero counts when no tasks exist', async () => {
      taskService.getPendingTasks.mockResolvedValue([]);
      taskService.findMany.mockResolvedValue([]);

      const result = await controller.getQueueStatus();

      expect(result).toEqual({
        pending: 0,
        processing: 0,
        failed: 0,
        total: 0,
      });
    });
  });

  describe('getPendingTasks', () => {
    it('should return pending tasks', async () => {
      const pendingTasks = TaskEntityMockFactory.createArray(5, {
        status: TaskStatus.PENDING,
      });

      taskService.getPendingTasks.mockResolvedValue(pendingTasks as any);

      const result = await controller.getPendingTasks();

      expect(taskService.getPendingTasks).toHaveBeenCalled();
      expect(result).toEqual(pendingTasks);
    });

    it('should return empty array when no pending tasks', async () => {
      taskService.getPendingTasks.mockResolvedValue([]);

      const result = await controller.getPendingTasks();

      expect(result).toEqual([]);
    });
  });

  describe('getFailedTasks', () => {
    it('should return failed tasks', async () => {
      const failedTasks = TaskEntityMockFactory.createArray(3, {
        status: TaskStatus.FAILED,
      });

      taskService.findMany.mockResolvedValue(failedTasks as any);

      const result = await controller.getFailedTasks();

      expect(taskService.findMany).toHaveBeenCalledWith({
        status: TaskStatus.FAILED,
      });
      expect(result).toEqual(failedTasks);
    });

    it('should return empty array when no failed tasks', async () => {
      taskService.findMany.mockResolvedValue([]);

      const result = await controller.getFailedTasks();

      expect(result).toEqual([]);
    });
  });

  describe('retryTask', () => {
    it('should retry a task successfully', async () => {
      const taskId = 'task-123';
      const mockTask = TaskEntityMockFactory.create({
        id: taskId,
        type: TaskType.HTTP_REQUEST,
        status: TaskStatus.FAILED,
      });

      taskService.getTaskById.mockResolvedValue(mockTask as any);
      taskService.updateTaskStatus.mockResolvedValue(mockTask as any);
      messagingService.publishTask.mockResolvedValue();

      const result = await controller.retryTask(taskId);

      expect(taskService.getTaskById).toHaveBeenCalledWith(taskId);
      expect(taskService.updateTaskStatus).toHaveBeenCalledWith(
        taskId,
        TaskStatus.PENDING,
      );
      expect(messagingService.publishTask).toHaveBeenCalledWith(
        mockTask.type,
        mockTask.id,
        { metadata: { retry: true } },
      );
      expect(result).toEqual({ message: 'Task queued for retry' });
    });

    it('should throw error when task is not found', async () => {
      const taskId = 'non-existent-task';

      taskService.getTaskById.mockResolvedValue(null);

      await expect(controller.retryTask(taskId)).rejects.toThrow(
        'Task not found',
      );

      expect(taskService.getTaskById).toHaveBeenCalledWith(taskId);
      expect(taskService.updateTaskStatus).not.toHaveBeenCalled();
      expect(messagingService.publishTask).not.toHaveBeenCalled();
    });

    it('should handle retry for different task types', async () => {
      const taskId = 'task-123';
      const mockTask = TaskEntityMockFactory.create({
        id: taskId,
        type: TaskType.DATA_PROCESSING,
        status: TaskStatus.FAILED,
      });

      taskService.getTaskById.mockResolvedValue(mockTask as any);
      taskService.updateTaskStatus.mockResolvedValue(mockTask as any);
      messagingService.publishTask.mockResolvedValue();

      const result = await controller.retryTask(taskId);

      expect(messagingService.publishTask).toHaveBeenCalledWith(
        TaskType.DATA_PROCESSING,
        taskId,
        { metadata: { retry: true } },
      );
      expect(result).toEqual({ message: 'Task queued for retry' });
    });
  });

  describe('cancelTask', () => {
    it('should cancel a pending task successfully', async () => {
      const taskId = 'task-123';
      const mockTask = TaskEntityMockFactory.create({
        id: taskId,
        status: TaskStatus.PENDING,
      });

      taskService.getTaskById.mockResolvedValue(mockTask as any);
      taskService.updateTaskStatus.mockResolvedValue(mockTask as any);

      const result = await controller.cancelTask(taskId);

      expect(taskService.getTaskById).toHaveBeenCalledWith(taskId);
      expect(taskService.updateTaskStatus).toHaveBeenCalledWith(
        taskId,
        TaskStatus.CANCELLED,
      );
      expect(result).toEqual({ message: 'Task cancelled successfully' });
    });

    it('should throw error when task is not found', async () => {
      const taskId = 'non-existent-task';

      taskService.getTaskById.mockResolvedValue(null);

      await expect(controller.cancelTask(taskId)).rejects.toThrow(
        'Task not found',
      );

      expect(taskService.getTaskById).toHaveBeenCalledWith(taskId);
      expect(taskService.updateTaskStatus).not.toHaveBeenCalled();
    });

    it('should throw error when trying to cancel non-pending task', async () => {
      const taskId = 'task-123';
      const mockTask = TaskEntityMockFactory.create({
        id: taskId,
        status: TaskStatus.PROCESSING,
      });

      taskService.getTaskById.mockResolvedValue(mockTask as any);

      await expect(controller.cancelTask(taskId)).rejects.toThrow(
        'Only pending tasks can be cancelled',
      );

      expect(taskService.getTaskById).toHaveBeenCalledWith(taskId);
      expect(taskService.updateTaskStatus).not.toHaveBeenCalled();
    });

    it('should throw error when trying to cancel completed task', async () => {
      const taskId = 'task-123';
      const mockTask = TaskEntityMockFactory.create({
        id: taskId,
        status: TaskStatus.COMPLETED,
      });

      taskService.getTaskById.mockResolvedValue(mockTask as any);

      await expect(controller.cancelTask(taskId)).rejects.toThrow(
        'Only pending tasks can be cancelled',
      );
    });

    it('should throw error when trying to cancel failed task', async () => {
      const taskId = 'task-123';
      const mockTask = TaskEntityMockFactory.create({
        id: taskId,
        status: TaskStatus.FAILED,
      });

      taskService.getTaskById.mockResolvedValue(mockTask as any);

      await expect(controller.cancelTask(taskId)).rejects.toThrow(
        'Only pending tasks can be cancelled',
      );
    });
  });
});
