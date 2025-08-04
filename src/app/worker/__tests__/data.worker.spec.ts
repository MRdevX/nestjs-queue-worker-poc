import { Test, TestingModule } from '@nestjs/testing';
import { TaskEntityMockFactory } from '@test/mocks';
import { DataWorker } from '../data.worker';
import { TaskService } from '../../task/task.service';
import { CoordinatorService } from '../../workflow/coordinator.service';
import { CoordinatorFactoryService } from '../../workflow/coordinator-factory.service';
import { InvoiceCoordinatorService } from '../../invoice/invoice-coordinator.service';
import { TaskType } from '../../task/types/task-type.enum';

describe('DataWorker', () => {
  let worker: DataWorker;
  let taskService: jest.Mocked<TaskService>;
  let coordinator: jest.Mocked<CoordinatorService>;
  let coordinatorFactory: jest.Mocked<CoordinatorFactoryService>;
  let invoiceCoordinator: jest.Mocked<InvoiceCoordinatorService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataWorker,
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
        {
          provide: CoordinatorFactoryService,
          useValue: {
            getCoordinator: jest.fn(),
          },
        },
        {
          provide: InvoiceCoordinatorService,
          useValue: {
            handleTaskCompletion: jest.fn(),
            handleTaskFailure: jest.fn(),
          },
        },
      ],
    }).compile();

    worker = module.get<DataWorker>(DataWorker);
    taskService = module.get(TaskService);
    coordinator = module.get(CoordinatorService);
    coordinatorFactory = module.get(CoordinatorFactoryService);
    invoiceCoordinator = module.get(InvoiceCoordinatorService);

    // Set up coordinator factory to return appropriate coordinator
    coordinatorFactory.getCoordinator.mockImplementation(
      (taskType: TaskType) => {
        const invoiceTaskTypes = [
          TaskType.FETCH_ORDERS,
          TaskType.CREATE_INVOICE,
          TaskType.GENERATE_PDF,
          TaskType.SEND_EMAIL,
        ];

        if (invoiceTaskTypes.includes(taskType)) {
          return invoiceCoordinator;
        }
        return coordinator;
      },
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleTask', () => {
    it('should handle data processing task successfully', async () => {
      const taskId = 'task-123';
      const task = TaskEntityMockFactory.create({
        id: taskId,
        type: TaskType.DATA_PROCESSING,
        payload: { source: 'database' },
      });

      taskService.getTaskById.mockResolvedValue(task as any);
      taskService.updateTaskStatus.mockResolvedValue(task as any);
      coordinator.handleTaskCompletion.mockResolvedValue();

      const originalRandom = Math.random;
      Math.random = jest.fn().mockReturnValue(0.5);

      try {
        await worker.handleTask({ taskId, taskType: TaskType.DATA_PROCESSING });

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
      } finally {
        Math.random = originalRandom;
      }
    });
  });

  describe('processTask', () => {
    it('should process data task successfully', async () => {
      const taskId = 'task-123';
      const task = TaskEntityMockFactory.create({
        id: taskId,
        type: TaskType.DATA_PROCESSING,
        payload: { source: 'database' },
      });

      taskService.getTaskById.mockResolvedValue(task as any);

      const originalRandom = Math.random;
      Math.random = jest.fn().mockReturnValue(0.5);

      try {
        await (worker as any).processTask(taskId);
        expect(taskService.getTaskById).toHaveBeenCalledWith(taskId);
      } finally {
        Math.random = originalRandom;
      }
    });

    it('should throw error when task not found', async () => {
      const taskId = 'non-existent-task';

      taskService.getTaskById.mockResolvedValue(null);

      await expect((worker as any).processTask(taskId)).rejects.toThrow(
        `Task with id ${taskId} not found`,
      );

      expect(taskService.getTaskById).toHaveBeenCalledWith(taskId);
    });

    it('should throw error when forceFailure is true', async () => {
      const taskId = 'task-123';
      const task = TaskEntityMockFactory.create({
        id: taskId,
        type: TaskType.DATA_PROCESSING,
        payload: { forceFailure: true },
      });

      taskService.getTaskById.mockResolvedValue(task as any);

      await expect((worker as any).processTask(taskId)).rejects.toThrow(
        'Forced failure for testing purposes',
      );

      expect(taskService.getTaskById).toHaveBeenCalledWith(taskId);
    });

    it('should sometimes throw random processing failure', async () => {
      const taskId = 'task-123';
      const task = TaskEntityMockFactory.create({
        id: taskId,
        type: TaskType.DATA_PROCESSING,
        payload: {},
      });

      taskService.getTaskById.mockResolvedValue(task as any);

      const originalRandom = Math.random;
      Math.random = jest.fn().mockReturnValue(0.9);

      try {
        await expect((worker as any).processTask(taskId)).rejects.toThrow(
          'Random processing failure',
        );
        expect(taskService.getTaskById).toHaveBeenCalledWith(taskId);
      } finally {
        Math.random = originalRandom;
      }
    });

    it('should process successfully when Math.random returns low value', async () => {
      const taskId = 'task-123';
      const task = TaskEntityMockFactory.create({
        id: taskId,
        type: TaskType.DATA_PROCESSING,
        payload: {},
      });

      taskService.getTaskById.mockResolvedValue(task as any);

      const originalRandom = Math.random;
      Math.random = jest.fn().mockReturnValue(0.5);

      try {
        await (worker as any).processTask(taskId);
        expect(taskService.getTaskById).toHaveBeenCalledWith(taskId);
      } finally {
        Math.random = originalRandom;
      }
    });
  });

  describe('shouldProcessTaskType', () => {
    it('should return true for DATA_PROCESSING task type', () => {
      expect(
        (worker as any).shouldProcessTaskType(TaskType.DATA_PROCESSING),
      ).toBe(true);
    });

    it('should return false for other task types', () => {
      expect((worker as any).shouldProcessTaskType(TaskType.HTTP_REQUEST)).toBe(
        false,
      );
      expect((worker as any).shouldProcessTaskType(TaskType.COMPENSATION)).toBe(
        false,
      );
    });
  });
});
