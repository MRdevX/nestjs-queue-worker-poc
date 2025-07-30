import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { MessagingService } from '@root/app/core/messaging/messaging.service';
import { TaskService } from '@root/app/task/task.service';
import { TaskType } from '@root/app/task/types/task-type.enum';
import { TaskEntityMockFactory } from '@test/mocks';
import { FaultService } from '../fault.service';

describe('FaultService', () => {
  let service: FaultService;
  let taskService: jest.Mocked<TaskService>;
  let messagingService: jest.Mocked<MessagingService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FaultService,
        {
          provide: TaskService,
          useValue: {
            getTaskById: jest.fn(),
            createTask: jest.fn(),
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

    service = module.get<FaultService>(FaultService);
    taskService = module.get(TaskService);
    messagingService = module.get(MessagingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleRetry', () => {
    it('should handle retry successfully with exponential backoff', async () => {
      const taskId = 'task-123';
      const task = TaskEntityMockFactory.create({
        id: taskId,
        type: TaskType.HTTP_REQUEST,
        retries: 3,
      });

      taskService.getTaskById.mockResolvedValue(task as any);
      messagingService.publishTask.mockResolvedValue();

      await service.handleRetry(taskId);

      expect(taskService.getTaskById).toHaveBeenCalledWith(taskId);
      expect(messagingService.publishTask).toHaveBeenCalledWith(
        task.type,
        task.id,
        {
          delay: 6000, // Math.min(30000, 2000 * 3)
          metadata: { retryCount: 3, isRetry: true },
        },
      );
    });

    it('should cap delay at maximum value', async () => {
      const taskId = 'task-123';
      const task = TaskEntityMockFactory.create({
        id: taskId,
        type: TaskType.HTTP_REQUEST,
        retries: 20, // Would be 40000ms, but capped at 30000ms
      });

      taskService.getTaskById.mockResolvedValue(task as any);
      messagingService.publishTask.mockResolvedValue();

      await service.handleRetry(taskId);

      expect(taskService.getTaskById).toHaveBeenCalledWith(taskId);
      expect(messagingService.publishTask).toHaveBeenCalledWith(
        task.type,
        task.id,
        {
          delay: 30000, // Capped at maximum
          metadata: { retryCount: 20, isRetry: true },
        },
      );
    });

    it('should handle first retry with minimal delay', async () => {
      const taskId = 'task-123';
      const task = TaskEntityMockFactory.create({
        id: taskId,
        type: TaskType.HTTP_REQUEST,
        retries: 0,
      });

      taskService.getTaskById.mockResolvedValue(task as any);
      messagingService.publishTask.mockResolvedValue();

      await service.handleRetry(taskId);

      expect(taskService.getTaskById).toHaveBeenCalledWith(taskId);
      expect(messagingService.publishTask).toHaveBeenCalledWith(
        task.type,
        task.id,
        {
          delay: 0, // Math.min(30000, 2000 * 0)
          metadata: { retryCount: 0, isRetry: true },
        },
      );
    });

    it('should throw error when taskId is empty', async () => {
      await expect(service.handleRetry('')).rejects.toThrow(
        'Task ID is required',
      );

      expect(taskService.getTaskById).not.toHaveBeenCalled();
      expect(messagingService.publishTask).not.toHaveBeenCalled();
    });

    it('should throw error when taskId is null', async () => {
      await expect(service.handleRetry(null as any)).rejects.toThrow(
        'Task ID is required',
      );

      expect(taskService.getTaskById).not.toHaveBeenCalled();
      expect(messagingService.publishTask).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when task not found', async () => {
      const taskId = 'non-existent-task';

      taskService.getTaskById.mockResolvedValue(null);

      await expect(service.handleRetry(taskId)).rejects.toThrow(
        NotFoundException,
      );

      expect(taskService.getTaskById).toHaveBeenCalledWith(taskId);
      expect(messagingService.publishTask).not.toHaveBeenCalled();
    });

    it('should handle messaging service error', async () => {
      const taskId = 'task-123';
      const task = TaskEntityMockFactory.create({
        id: taskId,
        type: TaskType.HTTP_REQUEST,
        retries: 1,
      });
      const messagingError = new Error('Messaging service failed');

      taskService.getTaskById.mockResolvedValue(task as any);
      messagingService.publishTask.mockRejectedValue(messagingError);

      await expect(service.handleRetry(taskId)).rejects.toThrow(
        'Messaging service failed',
      );

      expect(taskService.getTaskById).toHaveBeenCalledWith(taskId);
      expect(messagingService.publishTask).toHaveBeenCalledWith(
        task.type,
        task.id,
        {
          delay: 2000,
          metadata: { retryCount: 1, isRetry: true },
        },
      );
    });
  });

  describe('handleCompensation', () => {
    it('should handle compensation successfully', async () => {
      const taskId = 'task-123';
      const workflowId = 'workflow-456';
      const task = TaskEntityMockFactory.create({
        id: taskId,
        type: TaskType.HTTP_REQUEST,
        workflow: { id: workflowId },
      });
      const compensationTask = TaskEntityMockFactory.create({
        id: 'compensation-task-789',
        type: TaskType.COMPENSATION,
      });

      taskService.getTaskById.mockResolvedValue(task as any);
      taskService.createTask.mockResolvedValue(compensationTask as any);
      messagingService.publishTask.mockResolvedValue();

      await service.handleCompensation(taskId);

      expect(taskService.getTaskById).toHaveBeenCalledWith(taskId);
      expect(taskService.createTask).toHaveBeenCalledWith(
        TaskType.COMPENSATION,
        { originalTaskId: taskId, originalTaskType: task.type },
        workflowId,
      );
      expect(messagingService.publishTask).toHaveBeenCalledWith(
        compensationTask.type,
        compensationTask.id,
        {
          metadata: { originalTaskId: taskId, isCompensation: true },
        },
      );
    });

    it('should handle compensation for task without workflow', async () => {
      const taskId = 'task-123';
      const task = TaskEntityMockFactory.create({
        id: taskId,
        type: TaskType.HTTP_REQUEST,
        workflow: null,
      });
      const compensationTask = TaskEntityMockFactory.create({
        id: 'compensation-task-789',
        type: TaskType.COMPENSATION,
      });

      taskService.getTaskById.mockResolvedValue(task as any);
      taskService.createTask.mockResolvedValue(compensationTask as any);
      messagingService.publishTask.mockResolvedValue();

      await service.handleCompensation(taskId);

      expect(taskService.getTaskById).toHaveBeenCalledWith(taskId);
      expect(taskService.createTask).toHaveBeenCalledWith(
        TaskType.COMPENSATION,
        { originalTaskId: taskId, originalTaskType: task.type },
        undefined,
      );
      expect(messagingService.publishTask).toHaveBeenCalledWith(
        compensationTask.type,
        compensationTask.id,
        {
          metadata: { originalTaskId: taskId, isCompensation: true },
        },
      );
    });

    it('should throw error when taskId is empty', async () => {
      await expect(service.handleCompensation('')).rejects.toThrow(
        'Task ID is required',
      );

      expect(taskService.getTaskById).not.toHaveBeenCalled();
      expect(taskService.createTask).not.toHaveBeenCalled();
      expect(messagingService.publishTask).not.toHaveBeenCalled();
    });

    it('should throw error when taskId is null', async () => {
      await expect(service.handleCompensation(null as any)).rejects.toThrow(
        'Task ID is required',
      );

      expect(taskService.getTaskById).not.toHaveBeenCalled();
      expect(taskService.createTask).not.toHaveBeenCalled();
      expect(messagingService.publishTask).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when task not found', async () => {
      const taskId = 'non-existent-task';

      taskService.getTaskById.mockResolvedValue(null);

      await expect(service.handleCompensation(taskId)).rejects.toThrow(
        NotFoundException,
      );

      expect(taskService.getTaskById).toHaveBeenCalledWith(taskId);
      expect(taskService.createTask).not.toHaveBeenCalled();
      expect(messagingService.publishTask).not.toHaveBeenCalled();
    });

    it('should handle task creation error', async () => {
      const taskId = 'task-123';
      const task = TaskEntityMockFactory.create({
        id: taskId,
        type: TaskType.HTTP_REQUEST,
        workflow: { id: 'workflow-456' },
      });
      const creationError = new Error('Task creation failed');

      taskService.getTaskById.mockResolvedValue(task as any);
      taskService.createTask.mockRejectedValue(creationError);

      await expect(service.handleCompensation(taskId)).rejects.toThrow(
        'Task creation failed',
      );

      expect(taskService.getTaskById).toHaveBeenCalledWith(taskId);
      expect(taskService.createTask).toHaveBeenCalledWith(
        TaskType.COMPENSATION,
        { originalTaskId: taskId, originalTaskType: task.type },
        'workflow-456',
      );
      expect(messagingService.publishTask).not.toHaveBeenCalled();
    });

    it('should handle messaging service error', async () => {
      const taskId = 'task-123';
      const task = TaskEntityMockFactory.create({
        id: taskId,
        type: TaskType.HTTP_REQUEST,
        workflow: { id: 'workflow-456' },
      });
      const compensationTask = TaskEntityMockFactory.create({
        id: 'compensation-task-789',
        type: TaskType.COMPENSATION,
      });
      const messagingError = new Error('Messaging service failed');

      taskService.getTaskById.mockResolvedValue(task as any);
      taskService.createTask.mockResolvedValue(compensationTask as any);
      messagingService.publishTask.mockRejectedValue(messagingError);

      await expect(service.handleCompensation(taskId)).rejects.toThrow(
        'Messaging service failed',
      );

      expect(taskService.getTaskById).toHaveBeenCalledWith(taskId);
      expect(taskService.createTask).toHaveBeenCalledWith(
        TaskType.COMPENSATION,
        { originalTaskId: taskId, originalTaskType: task.type },
        'workflow-456',
      );
      expect(messagingService.publishTask).toHaveBeenCalledWith(
        compensationTask.type,
        compensationTask.id,
        {
          metadata: { originalTaskId: taskId, isCompensation: true },
        },
      );
    });
  });
});
