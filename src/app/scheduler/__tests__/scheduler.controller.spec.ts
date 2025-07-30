import { Test, TestingModule } from '@nestjs/testing';
import { SchedulerController } from '../scheduler.controller';
import { SchedulerService } from '../scheduler.service';
import { TaskType } from '../../task/types/task-type.enum';
import { TaskEntityMockFactory } from '@test/mocks';

describe('SchedulerController', () => {
  let controller: SchedulerController;
  let service: jest.Mocked<SchedulerService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SchedulerController],
      providers: [
        {
          provide: SchedulerService,
          useValue: {
            createScheduledTask: jest.fn(),
            createRecurringTask: jest.fn(),
            getScheduledTasks: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<SchedulerController>(SchedulerController);
    service = module.get(SchedulerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createScheduledTask', () => {
    it('should create a scheduled task successfully', async () => {
      const dto = {
        type: TaskType.HTTP_REQUEST,
        payload: { url: 'https://api.example.com' },
        scheduledAt: '2024-01-01T10:00:00Z',
        workflowId: 'workflow-123',
      };

      const mockTask = TaskEntityMockFactory.create({
        id: 'task-123',
        type: TaskType.HTTP_REQUEST,
        payload: dto.payload,
      });

      service.createScheduledTask.mockResolvedValue(mockTask as any);

      const result = await controller.createScheduledTask(dto);

      expect(service.createScheduledTask).toHaveBeenCalledWith(
        TaskType.HTTP_REQUEST,
        dto.payload,
        new Date(dto.scheduledAt),
        dto.workflowId,
      );
      expect(result).toEqual(mockTask);
    });

    it('should throw error for invalid scheduledAt date', async () => {
      const dto = {
        type: TaskType.HTTP_REQUEST,
        payload: { url: 'https://api.example.com' },
        scheduledAt: 'invalid-date',
        workflowId: 'workflow-123',
      };

      await expect(controller.createScheduledTask(dto)).rejects.toThrow(
        'Invalid scheduledAt date',
      );

      expect(service.createScheduledTask).not.toHaveBeenCalled();
    });

    it('should create scheduled task without workflowId', async () => {
      const dto = {
        type: TaskType.DATA_PROCESSING,
        payload: { source: 'database' },
        scheduledAt: '2024-01-01T10:00:00Z',
      };

      const mockTask = TaskEntityMockFactory.create({
        id: 'task-456',
        type: TaskType.DATA_PROCESSING,
        payload: dto.payload,
      });

      service.createScheduledTask.mockResolvedValue(mockTask as any);

      const result = await controller.createScheduledTask(dto);

      expect(service.createScheduledTask).toHaveBeenCalledWith(
        TaskType.DATA_PROCESSING,
        dto.payload,
        new Date(dto.scheduledAt),
        undefined,
      );
      expect(result).toEqual(mockTask);
    });
  });

  describe('createRecurringTask', () => {
    it('should create a recurring task successfully', async () => {
      const dto = {
        type: TaskType.HTTP_REQUEST,
        payload: { url: 'https://api.example.com' },
        cronExpression: '0 0 * * *',
        workflowId: 'workflow-123',
      };

      const mockTask = TaskEntityMockFactory.create({
        id: 'task-789',
        type: TaskType.HTTP_REQUEST,
        payload: dto.payload,
      });

      service.createRecurringTask.mockResolvedValue(mockTask as any);

      const result = await controller.createRecurringTask(dto);

      expect(service.createRecurringTask).toHaveBeenCalledWith(
        TaskType.HTTP_REQUEST,
        dto.payload,
        dto.cronExpression,
        dto.workflowId,
      );
      expect(result).toEqual(mockTask);
    });

    it('should create recurring task without workflowId', async () => {
      const dto = {
        type: TaskType.COMPENSATION,
        payload: { action: 'rollback' },
        cronExpression: '0 */6 * * *',
      };

      const mockTask = TaskEntityMockFactory.create({
        id: 'task-101',
        type: TaskType.COMPENSATION,
        payload: dto.payload,
      });

      service.createRecurringTask.mockResolvedValue(mockTask as any);

      const result = await controller.createRecurringTask(dto);

      expect(service.createRecurringTask).toHaveBeenCalledWith(
        TaskType.COMPENSATION,
        dto.payload,
        dto.cronExpression,
        undefined,
      );
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

      service.getScheduledTasks.mockResolvedValue(mockTasks as any);

      const result = await controller.getScheduledTasks();

      expect(service.getScheduledTasks).toHaveBeenCalled();
      expect(result).toEqual(mockTasks);
    });

    it('should return empty array when no scheduled tasks exist', async () => {
      service.getScheduledTasks.mockResolvedValue([]);

      const result = await controller.getScheduledTasks();

      expect(service.getScheduledTasks).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });
});
