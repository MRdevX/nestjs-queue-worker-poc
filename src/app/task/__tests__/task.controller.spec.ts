import { Test, TestingModule } from '@nestjs/testing';
import { TaskEntityMockFactory } from '@test/mocks';
import { TaskController } from '../task.controller';
import { TaskService } from '../task.service';
import { MessagingService } from '../../core/messaging/messaging.service';
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
      messagingService.publishTask.mockResolvedValue();

      const result = await controller.createTask(createTaskDto);

      expect(taskService.createTask).toHaveBeenCalledWith(
        createTaskDto.type,
        createTaskDto.payload,
      );
      expect(messagingService.publishTask).toHaveBeenCalledWith(
        mockTask.type,
        mockTask.id,
      );
      expect(result).toEqual(mockTask);
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
      messagingService.publishTask.mockResolvedValue();

      const result = await controller.createTask(createTaskDto);

      expect(taskService.createTask).toHaveBeenCalledWith(
        createTaskDto.type,
        createTaskDto.payload,
      );
      expect(result).toEqual(mockTask);
    });
  });

  describe('getTask', () => {
    it('should return task by id', async () => {
      const taskId = 'task-123';
      const mockTask = TaskEntityMockFactory.create({ id: taskId });

      taskService.getTaskById.mockResolvedValue(mockTask as any);

      const result = await controller.getTask(taskId);

      expect(taskService.getTaskById).toHaveBeenCalledWith(taskId);
      expect(result).toEqual(mockTask);
    });

    it('should throw NotFoundException when task is not found', async () => {
      const taskId = 'non-existent-task';

      taskService.getTaskById.mockResolvedValue(null);

      await expect(controller.getTask(taskId)).rejects.toThrow(
        'Task not found',
      );

      expect(taskService.getTaskById).toHaveBeenCalledWith(taskId);
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
});
