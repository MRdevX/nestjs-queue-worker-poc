import { Test, TestingModule } from '@nestjs/testing';
import { TaskEntityMockFactory } from '@test/mocks';
import { CompensationWorker } from '../compensation.worker';
import { TaskService } from '../../task/task.service';
import { CoordinatorService } from '../../workflow/coordinator.service';
import { MessagingService } from '../../core/messaging/messaging.service';
import { TaskType } from '../../task/types/task-type.enum';

describe('CompensationWorker', () => {
  let worker: CompensationWorker;
  let taskService: jest.Mocked<TaskService>;
  let coordinator: jest.Mocked<CoordinatorService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompensationWorker,
        {
          provide: TaskService,
          useValue: {
            getTaskById: jest.fn(),
            updateTaskStatus: jest.fn(),
            handleFailure: jest.fn(),
          },
        },
        {
          provide: CoordinatorService,
          useValue: {
            handleTaskCompletion: jest.fn(),
            handleTaskFailure: jest.fn(),
          },
        },
      ],
    }).compile();

    worker = module.get<CompensationWorker>(CompensationWorker);
    taskService = module.get(TaskService);
    coordinator = module.get(CoordinatorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleTask', () => {
    it('should handle compensation task successfully', async () => {
      const taskId = 'task-123';
      const task = TaskEntityMockFactory.create({
        id: taskId,
        type: TaskType.COMPENSATION,
        payload: { originalTaskId: 'original-task-456' },
      });

      taskService.getTaskById.mockResolvedValue(task as any);
      taskService.updateTaskStatus.mockResolvedValue(task as any);
      coordinator.handleTaskCompletion.mockResolvedValue();

      await worker.handleTask({ taskId, taskType: TaskType.COMPENSATION });

      expect(taskService.getTaskById).toHaveBeenCalledWith(taskId);
      expect(taskService.updateTaskStatus).toHaveBeenCalledWith(
        taskId,
        'processing',
      );
      expect(taskService.updateTaskStatus).toHaveBeenCalledWith(
        taskId,
        'completed',
      );
      expect(coordinator.handleTaskCompletion).toHaveBeenCalledWith(taskId);
    });
  });

  describe('processTask', () => {
    it('should process compensation task successfully', async () => {
      const taskId = 'task-123';
      const originalTaskId = 'original-task-456';
      const task = TaskEntityMockFactory.create({
        id: taskId,
        type: TaskType.COMPENSATION,
        payload: { originalTaskId },
      });

      taskService.getTaskById.mockResolvedValue(task as any);

      const startTime = Date.now();
      await (worker as any).processTask(taskId);
      const endTime = Date.now();

      expect(taskService.getTaskById).toHaveBeenCalledWith(taskId);

      expect(endTime - startTime).toBeGreaterThanOrEqual(1000);
    });

    it('should throw error when task not found', async () => {
      const taskId = 'non-existent-task';

      taskService.getTaskById.mockResolvedValue(null);

      await expect((worker as any).processTask(taskId)).rejects.toThrow(
        `Task with id ${taskId} not found`,
      );

      expect(taskService.getTaskById).toHaveBeenCalledWith(taskId);
    });

    it('should log compensation processing with original task ID', async () => {
      const taskId = 'task-123';
      const originalTaskId = 'original-task-456';
      const task = TaskEntityMockFactory.create({
        id: taskId,
        type: TaskType.COMPENSATION,
        payload: { originalTaskId },
      });

      taskService.getTaskById.mockResolvedValue(task as any);

      const logSpy = jest.spyOn(worker['logger'], 'log');

      await (worker as any).processTask(taskId);

      expect(taskService.getTaskById).toHaveBeenCalledWith(taskId);
      expect(logSpy).toHaveBeenCalledWith(
        `Processing compensation task ${taskId} for original task ${originalTaskId}`,
      );
      expect(logSpy).toHaveBeenCalledWith(
        `Compensation completed for task ${originalTaskId}`,
      );
    });
  });

  describe('shouldProcessTaskType', () => {
    it('should return true for COMPENSATION task type', () => {
      expect((worker as any).shouldProcessTaskType(TaskType.COMPENSATION)).toBe(
        true,
      );
    });

    it('should return false for other task types', () => {
      expect((worker as any).shouldProcessTaskType(TaskType.HTTP_REQUEST)).toBe(
        false,
      );
      expect(
        (worker as any).shouldProcessTaskType(TaskType.DATA_PROCESSING),
      ).toBe(false);
    });
  });
});
