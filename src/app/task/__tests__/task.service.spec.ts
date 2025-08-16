import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BaseRepositoryMockFactory } from '@test/mocks';
import { TaskEntityMockFactory } from '@test/mocks';
import { TaskService } from '../task.service';
import { TaskRepository } from '../task.repository';
import { TaskType } from '../types/task-type.enum';
import { TaskStatus } from '../types/task-status.enum';
import { TaskEntity } from '../task.entity';

describe('TaskService', () => {
  let service: TaskService;
  let taskRepository: jest.Mocked<TaskRepository>;

  beforeEach(async () => {
    const baseMock = BaseRepositoryMockFactory.createWithDefaults();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskService,
        {
          provide: TaskRepository,
          useValue: {
            ...baseMock,
            findPendingTasks: jest.fn(),
            updateTaskStatus: jest.fn(),
            incrementRetryCount: jest.fn(),
            findById: jest.fn(),
            findByIdWithRelations: jest.fn(),
            findMany: jest.fn(),
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TaskService>(TaskService);
    taskRepository = module.get(TaskRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createTask', () => {
    it('should create a task successfully', async () => {
      const taskData = {
        type: TaskType.HTTP_REQUEST,
        payload: { url: 'https://api.example.com' },
      };
      const mockTask = TaskEntityMockFactory.create({
        ...taskData,
        status: TaskStatus.PENDING,
      });

      taskRepository.create.mockResolvedValue(mockTask as TaskEntity);

      const result = await service.createTask(taskData.type, taskData.payload);

      expect(taskRepository.create).toHaveBeenCalledWith({
        type: taskData.type,
        payload: taskData.payload,
        status: TaskStatus.PENDING,
        workflow: undefined,
      });
      expect(result).toEqual(mockTask);
    });

    it('should create a task with workflow ID', async () => {
      const taskData = {
        type: TaskType.DATA_PROCESSING,
        payload: { source: 'database' },
      };
      const workflowId = 'workflow-123';
      const mockTask = TaskEntityMockFactory.create({
        ...taskData,
        status: TaskStatus.PENDING,
      });

      taskRepository.create.mockResolvedValue(mockTask as TaskEntity);

      await service.createTask(taskData.type, taskData.payload, workflowId);

      expect(taskRepository.create).toHaveBeenCalledWith({
        type: taskData.type,
        payload: taskData.payload,
        status: TaskStatus.PENDING,
        workflow: { id: workflowId },
      });
    });

    it('should throw BadRequestException when type is missing', async () => {
      await expect(
        service.createTask(null as any, { data: 'test' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when payload is missing', async () => {
      await expect(
        service.createTask(TaskType.HTTP_REQUEST, null as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateTaskStatus', () => {
    it('should update task status successfully', async () => {
      const taskId = 'task-123';
      const newStatus = TaskStatus.COMPLETED;
      const mockTask = TaskEntityMockFactory.create({
        id: taskId,
        status: newStatus,
      });

      taskRepository.updateTaskStatus.mockResolvedValue();
      taskRepository.findById.mockResolvedValue(mockTask as TaskEntity);

      const result = await service.updateTaskStatus(taskId, newStatus);

      expect(taskRepository.updateTaskStatus).toHaveBeenCalledWith(
        taskId,
        newStatus,
        undefined,
      );
      expect(result).toEqual(mockTask);
    });

    it('should update task status with error', async () => {
      const taskId = 'task-123';
      const newStatus = TaskStatus.FAILED;
      const error = 'Something went wrong';
      const mockTask = TaskEntityMockFactory.create({
        id: taskId,
        status: newStatus,
      });

      taskRepository.updateTaskStatus.mockResolvedValue();
      taskRepository.findById.mockResolvedValue(mockTask as TaskEntity);

      const result = await service.updateTaskStatus(taskId, newStatus, error);

      expect(taskRepository.updateTaskStatus).toHaveBeenCalledWith(
        taskId,
        newStatus,
        error,
      );
      expect(result).toEqual(mockTask);
    });

    it('should throw BadRequestException when taskId is missing', async () => {
      await expect(
        service.updateTaskStatus('', TaskStatus.COMPLETED),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when status is missing', async () => {
      const taskId = 'task-123';
      await expect(
        service.updateTaskStatus(taskId, null as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('handleFailure', () => {
    it('should handle failure and set status to PENDING when retries < maxRetries', async () => {
      const taskId = 'task-123';
      const error = new Error('Network error');
      const mockTask = TaskEntityMockFactory.create({
        id: taskId,
        retries: 1,
        maxRetries: 3,
      });

      taskRepository.findById.mockResolvedValue(mockTask as TaskEntity);
      taskRepository.incrementRetryCount.mockResolvedValue();
      taskRepository.updateTaskStatus.mockResolvedValue();

      await service.handleFailure(taskId, error);

      expect(taskRepository.incrementRetryCount).toHaveBeenCalledWith(taskId);
      expect(taskRepository.updateTaskStatus).toHaveBeenCalledWith(
        taskId,
        TaskStatus.PENDING,
        error.message,
      );
    });

    it('should handle failure and set status to FAILED when retries >= maxRetries', async () => {
      const taskId = 'task-123';
      const error = new Error('Network error');
      const mockTask = TaskEntityMockFactory.create({
        id: taskId,
        retries: 3,
        maxRetries: 3,
      });

      taskRepository.findById.mockResolvedValue(mockTask as TaskEntity);
      taskRepository.incrementRetryCount.mockResolvedValue();
      taskRepository.updateTaskStatus.mockResolvedValue();

      await service.handleFailure(taskId, error);

      expect(taskRepository.updateTaskStatus).toHaveBeenCalledWith(
        taskId,
        TaskStatus.FAILED,
        error.message,
      );
    });

    it('should throw BadRequestException when taskId is missing', async () => {
      await expect(
        service.handleFailure('', new Error('test')),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when task is not found', async () => {
      const taskId = 'task-123';
      taskRepository.findById.mockResolvedValue(null);

      await expect(
        service.handleFailure(taskId, new Error('test')),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when task is not found after retry increment', async () => {
      const taskId = 'task-123';
      const mockTask = TaskEntityMockFactory.create({ id: taskId });

      taskRepository.findById
        .mockResolvedValueOnce(mockTask as TaskEntity)
        .mockResolvedValueOnce(null);
      taskRepository.incrementRetryCount.mockResolvedValue();

      await expect(
        service.handleFailure(taskId, new Error('test')),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancelTask', () => {
    it('should cancel a pending task successfully', async () => {
      const taskId = 'task-123';
      const mockTask = TaskEntityMockFactory.create({
        id: taskId,
        status: TaskStatus.PENDING,
      });

      taskRepository.findById.mockResolvedValue(mockTask as TaskEntity);
      taskRepository.updateTaskStatus.mockResolvedValue();

      const result = await service.cancelTask(taskId);

      expect(taskRepository.findById).toHaveBeenCalledWith(taskId);
      expect(taskRepository.updateTaskStatus).toHaveBeenCalledWith(
        taskId,
        TaskStatus.CANCELLED,
        undefined,
      );
      expect(result).toEqual(mockTask);
    });

    it('should throw BadRequestException when taskId is missing', async () => {
      await expect(service.cancelTask('')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when task is not found', async () => {
      const taskId = 'task-123';
      taskRepository.findById.mockResolvedValue(null);

      await expect(service.cancelTask(taskId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when trying to cancel non-pending task', async () => {
      const taskId = 'task-123';
      const mockTask = TaskEntityMockFactory.create({
        id: taskId,
        status: TaskStatus.PROCESSING,
      });

      taskRepository.findById.mockResolvedValue(mockTask as TaskEntity);

      await expect(service.cancelTask(taskId)).rejects.toThrow(
        'Only pending tasks can be cancelled',
      );
    });

    it('should throw BadRequestException when trying to cancel completed task', async () => {
      const taskId = 'task-123';
      const mockTask = TaskEntityMockFactory.create({
        id: taskId,
        status: TaskStatus.COMPLETED,
      });

      taskRepository.findById.mockResolvedValue(mockTask as TaskEntity);

      await expect(service.cancelTask(taskId)).rejects.toThrow(
        'Only pending tasks can be cancelled',
      );
    });

    it('should throw BadRequestException when trying to cancel failed task', async () => {
      const taskId = 'task-123';
      const mockTask = TaskEntityMockFactory.create({
        id: taskId,
        status: TaskStatus.FAILED,
      });

      taskRepository.findById.mockResolvedValue(mockTask as TaskEntity);

      await expect(service.cancelTask(taskId)).rejects.toThrow(
        'Only pending tasks can be cancelled',
      );
    });
  });

  describe('getPendingTasks', () => {
    it('should return pending tasks with default limit', async () => {
      const mockTasks = TaskEntityMockFactory.createArray(3, {
        status: TaskStatus.PENDING,
      });

      taskRepository.findPendingTasks.mockResolvedValue(
        mockTasks as TaskEntity[],
      );

      const result = await service.getPendingTasks();

      expect(taskRepository.findPendingTasks).toHaveBeenCalledWith(100);
      expect(result).toEqual(mockTasks);
    });

    it('should return pending tasks with custom limit', async () => {
      const limit = 50;
      const mockTasks = TaskEntityMockFactory.createArray(2, {
        status: TaskStatus.PENDING,
      });

      taskRepository.findPendingTasks.mockResolvedValue(
        mockTasks as TaskEntity[],
      );

      const result = await service.getPendingTasks(limit);

      expect(taskRepository.findPendingTasks).toHaveBeenCalledWith(limit);
      expect(result).toEqual(mockTasks);
    });
  });

  describe('findTasks', () => {
    it('should return tasks matching criteria', async () => {
      const filters = { status: TaskStatus.FAILED };
      const mockTasks = TaskEntityMockFactory.createArray(2, {
        status: TaskStatus.FAILED,
      });

      taskRepository.findMany.mockResolvedValue(mockTasks as TaskEntity[]);

      const result = await service.findTasks(filters);

      expect(taskRepository.findMany).toHaveBeenCalledWith({
        status: TaskStatus.FAILED,
      });
      expect(result).toEqual(mockTasks);
    });
  });

  describe('getTaskById', () => {
    it('should return task by id', async () => {
      const taskId = 'task-123';
      const mockTask = TaskEntityMockFactory.create({ id: taskId });

      taskRepository.findById.mockResolvedValue(mockTask as TaskEntity);

      const result = await service.getTaskById(taskId);

      expect(taskRepository.findById).toHaveBeenCalledWith(taskId);
      expect(result).toEqual(mockTask);
    });

    it('should return task by id with relations', async () => {
      const taskId = 'task-123';
      const relations = ['workflow', 'logs'];
      const mockTask = TaskEntityMockFactory.create({ id: taskId });

      taskRepository.findByIdWithRelations.mockResolvedValue(
        mockTask as TaskEntity,
      );

      const result = await service.getTaskById(taskId, relations);

      expect(taskRepository.findByIdWithRelations).toHaveBeenCalledWith(
        taskId,
        relations,
      );
      expect(result).toEqual(mockTask);
    });

    it('should throw BadRequestException when taskId is missing', async () => {
      await expect(service.getTaskById('')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('updateTaskPayload', () => {
    it('should update task payload successfully', async () => {
      const taskId = 'task-123';
      const newPayload = { updated: 'data' };
      const mockTask = TaskEntityMockFactory.create({ id: taskId });

      taskRepository.update.mockResolvedValue(mockTask as TaskEntity);
      taskRepository.findById.mockResolvedValue(mockTask as TaskEntity);

      const result = await service.updateTaskPayload(taskId, newPayload);

      expect(taskRepository.update).toHaveBeenCalledWith(taskId, {
        payload: newPayload,
      });
      expect(result).toEqual(mockTask);
    });

    it('should throw BadRequestException when taskId is missing', async () => {
      await expect(
        service.updateTaskPayload('', { data: 'test' }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
