import { Test, TestingModule } from '@nestjs/testing';
import { TaskEntityMockFactory } from '@test/mocks';
import { SchedulerService } from '../scheduler.service';
import { TaskService } from '../../task/task.service';
import { MessagingService } from '../../core/messaging/messaging.service';
import { TaskRepository } from '../../task/task.repository';
import { TaskType } from '../../task/types/task-type.enum';
import { TaskStatus } from '../../task/types/task-status.enum';

describe('SchedulerService', () => {
  let service: SchedulerService;
  let taskService: jest.Mocked<TaskService>;
  let messagingService: jest.Mocked<MessagingService>;
  let taskRepository: jest.Mocked<TaskRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulerService,
        {
          provide: TaskService,
          useValue: {
            createTask: jest.fn(),
          },
        },
        {
          provide: MessagingService,
          useValue: {
            publishTask: jest.fn(),
          },
        },
        {
          provide: TaskRepository,
          useValue: {
            findScheduledTasks: jest.fn(),
            update: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SchedulerService>(SchedulerService);
    taskService = module.get(TaskService);
    messagingService = module.get(MessagingService);
    taskRepository = module.get(TaskRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createScheduledTask', () => {
    it('should create a scheduled task successfully', async () => {
      const type = TaskType.HTTP_REQUEST;
      const payload = { url: 'https://api.example.com' };
      const scheduledAt = new Date('2024-01-01T10:00:00Z');
      const workflowId = 'workflow-123';

      const mockTask = TaskEntityMockFactory.create({
        id: 'task-123',
        type,
        payload,
      });

      taskService.createTask.mockResolvedValue(mockTask as any);
      taskRepository.update.mockResolvedValue(mockTask as any);

      const result = await service.createScheduledTask(
        type,
        payload,
        scheduledAt,
        workflowId,
      );

      expect(taskService.createTask).toHaveBeenCalledWith(
        type,
        payload,
        workflowId,
      );
      expect(taskRepository.update).toHaveBeenCalledWith(mockTask.id, {
        scheduledAt,
      });
      expect(result).toEqual(mockTask);
    });

    it('should create scheduled task without workflowId', async () => {
      const type = TaskType.DATA_PROCESSING;
      const payload = { source: 'database' };
      const scheduledAt = new Date('2024-01-01T11:00:00Z');

      const mockTask = TaskEntityMockFactory.create({
        id: 'task-456',
        type,
        payload,
      });

      taskService.createTask.mockResolvedValue(mockTask as any);
      taskRepository.update.mockResolvedValue(mockTask as any);

      const result = await service.createScheduledTask(
        type,
        payload,
        scheduledAt,
      );

      expect(taskService.createTask).toHaveBeenCalledWith(
        type,
        payload,
        undefined,
      );
      expect(taskRepository.update).toHaveBeenCalledWith(mockTask.id, {
        scheduledAt,
      });
      expect(result).toEqual(mockTask);
    });
  });

  describe('createRecurringTask', () => {
    it('should create a recurring task successfully', async () => {
      const type = TaskType.HTTP_REQUEST;
      const payload = { url: 'https://api.example.com' };
      const cronExpression = '0 0 * * *';
      const workflowId = 'workflow-123';

      const mockTask = TaskEntityMockFactory.create({
        id: 'task-789',
        type,
        payload,
      });

      taskService.createTask.mockResolvedValue(mockTask as any);
      taskRepository.update.mockResolvedValue(mockTask as any);

      const result = await service.createRecurringTask(
        type,
        payload,
        cronExpression,
        workflowId,
      );

      expect(taskService.createTask).toHaveBeenCalledWith(
        type,
        payload,
        workflowId,
      );
      expect(taskRepository.update).toHaveBeenCalledWith(mockTask.id, {
        payload: { ...payload, cronExpression, isRecurring: true },
      });
      expect(result).toEqual(mockTask);
    });

    it('should create recurring task without workflowId', async () => {
      const type = TaskType.COMPENSATION;
      const payload = { action: 'rollback' };
      const cronExpression = '0 */6 * * *';

      const mockTask = TaskEntityMockFactory.create({
        id: 'task-101',
        type,
        payload,
      });

      taskService.createTask.mockResolvedValue(mockTask as any);
      taskRepository.update.mockResolvedValue(mockTask as any);

      const result = await service.createRecurringTask(
        type,
        payload,
        cronExpression,
      );

      expect(taskService.createTask).toHaveBeenCalledWith(
        type,
        payload,
        undefined,
      );
      expect(taskRepository.update).toHaveBeenCalledWith(mockTask.id, {
        payload: { ...payload, cronExpression, isRecurring: true },
      });
      expect(result).toEqual(mockTask);
    });
  });

  describe('getScheduledTasks', () => {
    it('should return scheduled tasks', async () => {
      const mockTasks = [
        TaskEntityMockFactory.create({
          id: 'task-1',
          type: TaskType.HTTP_REQUEST,
          scheduledAt: new Date('2024-01-01T10:00:00Z'),
        }),
        TaskEntityMockFactory.create({
          id: 'task-2',
          type: TaskType.DATA_PROCESSING,
          scheduledAt: new Date('2024-01-01T11:00:00Z'),
        }),
      ];

      taskRepository.findScheduledTasks.mockResolvedValue(mockTasks as any);

      const result = await service.getScheduledTasks();

      expect(taskRepository.findScheduledTasks).toHaveBeenCalled();
      expect(result).toEqual(mockTasks);
    });

    it('should return empty array when no scheduled tasks exist', async () => {
      taskRepository.findScheduledTasks.mockResolvedValue([]);

      const result = await service.getScheduledTasks();

      expect(taskRepository.findScheduledTasks).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('processScheduledTasks', () => {
    it('should process scheduled tasks that are due for execution', async () => {
      const pastDate = new Date(Date.now() - 60000);
      const mockTasks = [
        TaskEntityMockFactory.create({
          id: 'task-1',
          type: TaskType.HTTP_REQUEST,
          scheduledAt: pastDate,
        }),
        TaskEntityMockFactory.create({
          id: 'task-2',
          type: TaskType.DATA_PROCESSING,
          scheduledAt: pastDate,
        }),
      ];

      taskRepository.findScheduledTasks.mockResolvedValue(mockTasks as any);
      taskRepository.update.mockResolvedValue(mockTasks[0] as any);
      messagingService.publishTask.mockResolvedValue(undefined);

      await service.processScheduledTasks();

      expect(taskRepository.findScheduledTasks).toHaveBeenCalled();
      expect(taskRepository.update).toHaveBeenCalledTimes(2);
      expect(messagingService.publishTask).toHaveBeenCalledTimes(2);

      expect(taskRepository.update).toHaveBeenCalledWith('task-1', {
        status: TaskStatus.PENDING,
        scheduledAt: null,
      });
      expect(taskRepository.update).toHaveBeenCalledWith('task-2', {
        status: TaskStatus.PENDING,
        scheduledAt: null,
      });

      expect(messagingService.publishTask).toHaveBeenCalledWith(
        TaskType.HTTP_REQUEST,
        'task-1',
      );
      expect(messagingService.publishTask).toHaveBeenCalledWith(
        TaskType.DATA_PROCESSING,
        'task-2',
      );
    });

    it('should not process tasks that are not due yet', async () => {
      const futureDate = new Date(Date.now() + 60000);
      const mockTasks = [
        TaskEntityMockFactory.create({
          id: 'task-1',
          type: TaskType.HTTP_REQUEST,
          scheduledAt: futureDate,
        }),
      ];

      taskRepository.findScheduledTasks.mockResolvedValue(mockTasks as any);

      await service.processScheduledTasks();

      expect(taskRepository.findScheduledTasks).toHaveBeenCalled();
      expect(taskRepository.update).not.toHaveBeenCalled();
      expect(messagingService.publishTask).not.toHaveBeenCalled();
    });

    it('should handle tasks without scheduledAt', async () => {
      const mockTasks = [
        TaskEntityMockFactory.create({
          id: 'task-1',
          type: TaskType.HTTP_REQUEST,
          scheduledAt: null,
        }),
      ];

      taskRepository.findScheduledTasks.mockResolvedValue(mockTasks as any);

      await service.processScheduledTasks();

      expect(taskRepository.findScheduledTasks).toHaveBeenCalled();
      expect(taskRepository.update).not.toHaveBeenCalled();
      expect(messagingService.publishTask).not.toHaveBeenCalled();
    });

    it('should handle errors during task processing', async () => {
      const pastDate = new Date(Date.now() - 60000);
      const mockTasks = [
        TaskEntityMockFactory.create({
          id: 'task-1',
          type: TaskType.HTTP_REQUEST,
          scheduledAt: pastDate,
        }),
      ];

      taskRepository.findScheduledTasks.mockResolvedValue(mockTasks as any);
      taskRepository.update.mockRejectedValue(new Error('Database error'));

      await service.processScheduledTasks();

      expect(taskRepository.findScheduledTasks).toHaveBeenCalled();
      expect(taskRepository.update).toHaveBeenCalled();
      expect(messagingService.publishTask).not.toHaveBeenCalled();
    });

    it('should handle errors during task publishing', async () => {
      const pastDate = new Date(Date.now() - 60000);
      const mockTasks = [
        TaskEntityMockFactory.create({
          id: 'task-1',
          type: TaskType.HTTP_REQUEST,
          scheduledAt: pastDate,
        }),
      ];

      taskRepository.findScheduledTasks.mockResolvedValue(mockTasks as any);
      taskRepository.update.mockResolvedValue(mockTasks[0] as any);
      messagingService.publishTask.mockRejectedValue(
        new Error('Messaging error'),
      );

      await service.processScheduledTasks();

      expect(taskRepository.findScheduledTasks).toHaveBeenCalled();
      expect(taskRepository.update).toHaveBeenCalled();
      expect(messagingService.publishTask).toHaveBeenCalled();
    });

    it('should handle errors when finding scheduled tasks', async () => {
      taskRepository.findScheduledTasks.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await service.processScheduledTasks();

      expect(taskRepository.findScheduledTasks).toHaveBeenCalled();
      expect(taskRepository.update).not.toHaveBeenCalled();
      expect(messagingService.publishTask).not.toHaveBeenCalled();
    });
  });
});
