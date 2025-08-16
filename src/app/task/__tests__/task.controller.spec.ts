import { Test, TestingModule } from '@nestjs/testing';
import { TaskEntityMockFactory } from '@test/mocks';
import { TaskController } from '../task.controller';
import { TaskService } from '../task.service';
import { MessagingService } from '../../core/messaging/services/messaging.service';
import { TaskType } from '../types/task-type.enum';
import { TaskStatus } from '../types/task-status.enum';

describe('TaskController', () => {
  let controller: TaskController;
  let taskService: jest.Mocked<TaskService>;
  let messagingService: jest.Mocked<MessagingService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TaskController],
      providers: [
        {
          provide: TaskService,
          useValue: {
            createTask: jest.fn(),
            getTaskById: jest.fn(),
            updateTaskStatus: jest.fn(),
            cancelTask: jest.fn(),
            findTasks: jest.fn(),
          },
        },
        {
          provide: MessagingService,
          useValue: {
            publishTask: jest.fn(),
            emitEvent: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<TaskController>(TaskController);
    taskService = module.get(TaskService);
    messagingService = module.get(MessagingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createTask', () => {
    it('should create a task and publish it successfully', async () => {
      const createTaskDto = {
        type: TaskType.HTTP_REQUEST,
        payload: { url: 'https://api.example.com' },
      };
      const mockTask = TaskEntityMockFactory.create({
        ...createTaskDto,
        status: TaskStatus.PENDING,
      });

      taskService.createTask.mockResolvedValue(mockTask as any);
      messagingService.emitEvent.mockResolvedValue(undefined);

      const result = await controller.createTask(createTaskDto);

      expect(taskService.createTask).toHaveBeenCalledWith(
        createTaskDto.type,
        createTaskDto.payload,
      );
      expect(messagingService.emitEvent).toHaveBeenCalledWith('http.request', {
        taskId: mockTask.id,
        taskType: mockTask.type,
        ...createTaskDto.payload,
      });
      expect(result).toEqual({
        message: 'Task created and queued successfully',
        taskId: mockTask.id,
        type: mockTask.type,
        status: mockTask.status,
      });
    });

    it('should handle task creation with different task types', async () => {
      const createTaskDto = {
        type: TaskType.DATA_PROCESSING,
        payload: { source: 'database', transformation: 'aggregate' },
      };
      const mockTask = TaskEntityMockFactory.create({
        ...createTaskDto,
        status: TaskStatus.PENDING,
      });

      taskService.createTask.mockResolvedValue(mockTask as any);
      messagingService.emitEvent.mockResolvedValue(undefined);

      const result = await controller.createTask(createTaskDto);

      expect(taskService.createTask).toHaveBeenCalledWith(
        createTaskDto.type,
        createTaskDto.payload,
      );
      expect(messagingService.emitEvent).toHaveBeenCalledWith(
        'data.processing',
        {
          taskId: mockTask.id,
          taskType: mockTask.type,
          ...createTaskDto.payload,
        },
      );
      expect(result).toEqual({
        message: 'Task created and queued successfully',
        taskId: mockTask.id,
        type: mockTask.type,
        status: mockTask.status,
      });
    });
  });

  describe('getTasks', () => {
    it('should return tasks with filters', async () => {
      const filters = { status: TaskStatus.PENDING };
      const mockTasks = TaskEntityMockFactory.createArray(2, { status: TaskStatus.PENDING });

      taskService.findTasks.mockResolvedValue(mockTasks as any);

      const result = await controller.getTasks(filters);

      expect(taskService.findTasks).toHaveBeenCalledWith(filters);
      expect(result).toEqual({
        tasks: mockTasks,
        total: mockTasks.length,
      });
    });
  });

  describe('getTask', () => {
    it('should return task by id', async () => {
      const taskId = 'task-123';
      const mockTask = TaskEntityMockFactory.create({ id: taskId });

      taskService.getTaskById.mockResolvedValue(mockTask as any);

      const result = await controller.getTask(taskId);

      expect(taskService.getTaskById).toHaveBeenCalledWith(taskId, undefined);
      expect(result).toEqual(mockTask);
    });

    it('should return task with relations', async () => {
      const taskId = 'task-123';
      const relations = 'workflow,logs';
      const mockTask = TaskEntityMockFactory.create({ id: taskId });

      taskService.getTaskById.mockResolvedValue(mockTask as any);

      const result = await controller.getTask(taskId, relations);

      expect(taskService.getTaskById).toHaveBeenCalledWith(taskId, ['workflow', 'logs']);
      expect(result).toEqual(mockTask);
    });

    it('should throw NotFoundException when task is not found', async () => {
      const taskId = 'non-existent-task';

      taskService.getTaskById.mockRejectedValue(new Error('Task not found'));

      await expect(controller.getTask(taskId)).rejects.toThrow('Task not found');

      expect(taskService.getTaskById).toHaveBeenCalledWith(taskId, undefined);
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
      messagingService.emitEvent.mockResolvedValue(undefined);

      const result = await controller.retryTask(taskId);

      expect(taskService.getTaskById).toHaveBeenCalledWith(taskId);
      expect(taskService.updateTaskStatus).toHaveBeenCalledWith(
        taskId,
        TaskStatus.PENDING,
      );
      expect(messagingService.emitEvent).toHaveBeenCalledWith(
        'http.request',
        {
          taskId: mockTask.id,
          taskType: mockTask.type,
          ...mockTask.payload,
        },
        { metadata: { retry: true } },
      );
      expect(result).toEqual({ message: 'Task queued for retry' });
    });

    it('should throw error when task is not found', async () => {
      const taskId = 'non-existent-task';

      taskService.getTaskById.mockRejectedValue(new Error('Task not found'));

      await expect(controller.retryTask(taskId)).rejects.toThrow('Task not found');

      expect(taskService.getTaskById).toHaveBeenCalledWith(taskId);
      expect(taskService.updateTaskStatus).not.toHaveBeenCalled();
      expect(messagingService.emitEvent).not.toHaveBeenCalled();
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
      messagingService.emitEvent.mockResolvedValue(undefined);

      const result = await controller.retryTask(taskId);

      expect(messagingService.emitEvent).toHaveBeenCalledWith(
        'data.processing',
        {
          taskId: mockTask.id,
          taskType: mockTask.type,
          ...mockTask.payload,
        },
        { metadata: { retry: true } },
      );
      expect(result).toEqual({ message: 'Task queued for retry' });
    });
  });

  describe('cancelTask', () => {
    it('should cancel a task successfully', async () => {
      const taskId = 'task-123';
      const mockTask = TaskEntityMockFactory.create({
        id: taskId,
        status: TaskStatus.PENDING,
      });

      taskService.cancelTask.mockResolvedValue(mockTask as any);

      const result = await controller.cancelTask(taskId);

      expect(taskService.cancelTask).toHaveBeenCalledWith(taskId);
      expect(result).toEqual({ message: 'Task cancelled successfully' });
    });

    it('should handle cancellation for different task types', async () => {
      const taskId = 'task-123';
      const mockTask = TaskEntityMockFactory.create({
        id: taskId,
        type: TaskType.HTTP_REQUEST,
        status: TaskStatus.PENDING,
      });

      taskService.cancelTask.mockResolvedValue(mockTask as any);

      const result = await controller.cancelTask(taskId);

      expect(taskService.cancelTask).toHaveBeenCalledWith(taskId);
      expect(result).toEqual({ message: 'Task cancelled successfully' });
    });
  });

  describe('compensateTask', () => {
    it('should create a compensation task successfully', async () => {
      const taskId = 'task-123';
      const mockTask = TaskEntityMockFactory.create({
        id: taskId,
        type: TaskType.HTTP_REQUEST,
        status: TaskStatus.FAILED,
      });
      const mockCompensationTask = TaskEntityMockFactory.create({
        id: 'compensation-123',
        type: TaskType.COMPENSATION,
        status: TaskStatus.PENDING,
      });

      taskService.getTaskById.mockResolvedValue(mockTask as any);
      taskService.createTask.mockResolvedValue(mockCompensationTask as any);
      messagingService.emitEvent.mockResolvedValue(undefined);

      const result = await controller.compensateTask(taskId);

      expect(taskService.getTaskById).toHaveBeenCalledWith(taskId);
      expect(taskService.createTask).toHaveBeenCalledWith(
        TaskType.COMPENSATION,
        {
          originalTaskId: taskId,
          originalTaskType: mockTask.type,
          compensationAction: 'rollback',
        },
      );
      expect(messagingService.emitEvent).toHaveBeenCalledWith(
        'compensation',
        {
          taskId: mockCompensationTask.id,
          taskType: mockCompensationTask.type,
          originalTaskId: taskId,
          originalTaskType: mockTask.type,
          compensationAction: 'rollback',
        },
        { metadata: { originalTaskId: taskId, isCompensation: true } },
      );
      expect(result).toEqual({
        message: 'Compensation task created and queued',
      });
    });

    it('should throw error when task is not found', async () => {
      const taskId = 'non-existent-task';

      taskService.getTaskById.mockRejectedValue(new Error('Task not found'));

      await expect(controller.compensateTask(taskId)).rejects.toThrow('Task not found');

      expect(taskService.getTaskById).toHaveBeenCalledWith(taskId);
      expect(taskService.createTask).not.toHaveBeenCalled();
      expect(messagingService.emitEvent).not.toHaveBeenCalled();
    });
  });
});
