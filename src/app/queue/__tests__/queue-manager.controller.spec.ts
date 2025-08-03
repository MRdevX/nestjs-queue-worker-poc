import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { QueueManagerController } from '../queue-manager.controller';
import { QueueManagerService } from '../queue-manager.service';
import { TaskType } from '../../task/types/task-type.enum';
import { IEnqueueTaskDto } from '../types/queue.types';

describe('QueueManagerController', () => {
  let controller: QueueManagerController;
  let queueManagerService: jest.Mocked<QueueManagerService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QueueManagerController],
      providers: [
        {
          provide: QueueManagerService,
          useValue: {
            enqueueTask: jest.fn(),
            retryTask: jest.fn(),
            getQueueStatus: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<QueueManagerController>(QueueManagerController);
    queueManagerService = module.get(QueueManagerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('enqueueTask', () => {
    it('should enqueue a task successfully', async () => {
      const enqueueTaskDto: IEnqueueTaskDto = {
        type: TaskType.HTTP_REQUEST,
        payload: { url: 'https://api.example.com' },
        workflowId: 'workflow-123',
      };

      const taskId = 'task-123';
      queueManagerService.enqueueTask.mockResolvedValue(taskId);

      const result = await controller.enqueueTask(enqueueTaskDto);

      expect(queueManagerService.enqueueTask).toHaveBeenCalledWith(
        TaskType.HTTP_REQUEST,
        { url: 'https://api.example.com' },
        'workflow-123',
      );
      expect(result).toEqual({
        taskId,
        message: 'Task enqueued successfully',
      });
    });

    it('should enqueue a task without workflowId', async () => {
      const enqueueTaskDto: IEnqueueTaskDto = {
        type: TaskType.DATA_PROCESSING,
        payload: { data: 'test-data' },
      };

      const taskId = 'task-456';
      queueManagerService.enqueueTask.mockResolvedValue(taskId);

      const result = await controller.enqueueTask(enqueueTaskDto);

      expect(queueManagerService.enqueueTask).toHaveBeenCalledWith(
        TaskType.DATA_PROCESSING,
        { data: 'test-data' },
        undefined,
      );
      expect(result).toEqual({
        taskId,
        message: 'Task enqueued successfully',
      });
    });

    it('should throw BadRequestException when type is missing', async () => {
      const enqueueTaskDto = {
        payload: { url: 'https://api.example.com' },
        workflowId: 'workflow-123',
      } as IEnqueueTaskDto;

      await expect(controller.enqueueTask(enqueueTaskDto)).rejects.toThrow(
        BadRequestException,
      );

      expect(queueManagerService.enqueueTask).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when payload is missing', async () => {
      const enqueueTaskDto = {
        type: TaskType.HTTP_REQUEST,
        workflowId: 'workflow-123',
      } as IEnqueueTaskDto;

      await expect(controller.enqueueTask(enqueueTaskDto)).rejects.toThrow(
        BadRequestException,
      );

      expect(queueManagerService.enqueueTask).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when both type and payload are missing', async () => {
      const enqueueTaskDto = {
        workflowId: 'workflow-123',
      } as IEnqueueTaskDto;

      await expect(controller.enqueueTask(enqueueTaskDto)).rejects.toThrow(
        BadRequestException,
      );

      expect(queueManagerService.enqueueTask).not.toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      const enqueueTaskDto: IEnqueueTaskDto = {
        type: TaskType.HTTP_REQUEST,
        payload: { url: 'https://api.example.com' },
      };

      const error = new Error('Service error');
      queueManagerService.enqueueTask.mockRejectedValue(error);

      await expect(controller.enqueueTask(enqueueTaskDto)).rejects.toThrow(
        'Service error',
      );

      expect(queueManagerService.enqueueTask).toHaveBeenCalledWith(
        TaskType.HTTP_REQUEST,
        { url: 'https://api.example.com' },
        undefined,
      );
    });
  });

  describe('retryTask', () => {
    it('should retry a task successfully', async () => {
      const taskId = 'task-123';
      queueManagerService.retryTask.mockResolvedValue();

      const result = await controller.retryTask(taskId);

      expect(queueManagerService.retryTask).toHaveBeenCalledWith(taskId);
      expect(result).toEqual({
        message: 'Task retry initiated',
      });
    });

    it('should handle service errors during retry', async () => {
      const taskId = 'task-123';
      const error = new Error('Task not found');
      queueManagerService.retryTask.mockRejectedValue(error);

      await expect(controller.retryTask(taskId)).rejects.toThrow(
        'Task not found',
      );

      expect(queueManagerService.retryTask).toHaveBeenCalledWith(taskId);
    });

    it('should handle empty taskId', async () => {
      const taskId = '';
      queueManagerService.retryTask.mockResolvedValue();

      const result = await controller.retryTask(taskId);

      expect(queueManagerService.retryTask).toHaveBeenCalledWith('');
      expect(result).toEqual({
        message: 'Task retry initiated',
      });
    });
  });

  describe('getQueueStatus', () => {
    it('should return queue status successfully', async () => {
      const mockQueueStatus = {
        pending: 5,
        processing: 2,
        completed: 100,
        failed: 3,
        total: 110,
        isHealthy: true,
      };

      queueManagerService.getQueueStatus.mockResolvedValue(mockQueueStatus);

      const result = await controller.getQueueStatus();

      expect(queueManagerService.getQueueStatus).toHaveBeenCalled();
      expect(result).toEqual(mockQueueStatus);
    });

    it('should handle unhealthy queue status', async () => {
      const mockQueueStatus = {
        pending: 600,
        processing: 10,
        completed: 50,
        failed: 60,
        total: 720,
        isHealthy: false,
      };

      queueManagerService.getQueueStatus.mockResolvedValue(mockQueueStatus);

      const result = await controller.getQueueStatus();

      expect(queueManagerService.getQueueStatus).toHaveBeenCalled();
      expect(result).toEqual(mockQueueStatus);
      expect(result.isHealthy).toBe(false);
    });

    it('should handle empty queue status', async () => {
      const mockQueueStatus = {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        total: 0,
        isHealthy: true,
      };

      queueManagerService.getQueueStatus.mockResolvedValue(mockQueueStatus);

      const result = await controller.getQueueStatus();

      expect(queueManagerService.getQueueStatus).toHaveBeenCalled();
      expect(result).toEqual(mockQueueStatus);
      expect(result.total).toBe(0);
    });

    it('should handle service errors during status retrieval', async () => {
      const error = new Error('Database connection failed');
      queueManagerService.getQueueStatus.mockRejectedValue(error);

      await expect(controller.getQueueStatus()).rejects.toThrow(
        'Database connection failed',
      );

      expect(queueManagerService.getQueueStatus).toHaveBeenCalled();
    });
  });
});
