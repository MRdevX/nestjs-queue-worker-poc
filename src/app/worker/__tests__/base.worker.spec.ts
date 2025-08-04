import { Test, TestingModule } from '@nestjs/testing';
import { TaskEntityMockFactory } from '@test/mocks';
import { BaseWorker } from '../base.worker';
import { TaskService } from '../../task/task.service';
import { CoordinatorService } from '../../workflow/coordinator.service';
import { CoordinatorFactoryService } from '../../workflow/coordinator-factory.service';
import { InvoiceCoordinatorService } from '../../invoice/invoice-coordinator.service';
import { TaskType } from '../../task/types/task-type.enum';
import { TaskStatus } from '../../task/types/task-status.enum';

class TestWorker extends BaseWorker {
  protected async processTask(taskId: string): Promise<void> {
    if (taskId) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }

  protected shouldProcessTaskType(taskType: TaskType): boolean {
    return taskType === TaskType.HTTP_REQUEST;
  }
}

describe('BaseWorker', () => {
  let worker: TestWorker;
  let taskService: jest.Mocked<TaskService>;
  let coordinator: jest.Mocked<CoordinatorService>;
  let coordinatorFactory: jest.Mocked<CoordinatorFactoryService>;
  let invoiceCoordinator: jest.Mocked<InvoiceCoordinatorService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TestWorker,
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

    worker = module.get<TestWorker>(TestWorker);
    taskService = module.get(TaskService);
    coordinator = module.get(CoordinatorService);
    coordinatorFactory = module.get(CoordinatorFactoryService);
    invoiceCoordinator = module.get(InvoiceCoordinatorService);

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
    it('should process task successfully', async () => {
      const taskId = 'task-123';
      const task = TaskEntityMockFactory.create({
        id: taskId,
        type: TaskType.HTTP_REQUEST,
        status: TaskStatus.PENDING,
      });

      taskService.getTaskById.mockResolvedValue(task as any);
      taskService.updateTaskStatus.mockResolvedValue(task as any);
      coordinator.handleTaskCompletion.mockResolvedValue();

      await worker.handleTask({ taskId, taskType: TaskType.HTTP_REQUEST });

      expect(taskService.getTaskById).toHaveBeenCalledWith(taskId);
      expect(taskService.updateTaskStatus).toHaveBeenCalledWith(
        taskId,
        TaskStatus.PROCESSING,
      );
      expect(taskService.updateTaskStatus).toHaveBeenCalledWith(
        taskId,
        TaskStatus.COMPLETED,
      );
      expect(coordinator.handleTaskCompletion).toHaveBeenCalledWith(taskId);
    });

    it('should skip task when not found', async () => {
      const taskId = 'non-existent-task';

      taskService.getTaskById.mockResolvedValue(null);

      await worker.handleTask({ taskId, taskType: TaskType.HTTP_REQUEST });

      expect(taskService.getTaskById).toHaveBeenCalledWith(taskId);
      expect(taskService.updateTaskStatus).not.toHaveBeenCalled();
      expect(coordinator.handleTaskCompletion).not.toHaveBeenCalled();
    });

    it('should skip task when worker does not handle task type', async () => {
      const taskId = 'task-123';
      const task = TaskEntityMockFactory.create({
        id: taskId,
        type: TaskType.DATA_PROCESSING,
        status: TaskStatus.PENDING,
      });

      taskService.getTaskById.mockResolvedValue(task as any);

      await worker.handleTask({ taskId, taskType: TaskType.DATA_PROCESSING });

      expect(taskService.getTaskById).toHaveBeenCalledWith(taskId);
      expect(taskService.updateTaskStatus).not.toHaveBeenCalled();
      expect(coordinator.handleTaskCompletion).not.toHaveBeenCalled();
    });

    it('should handle task with delay', async () => {
      const taskId = 'task-123';
      const delay = 100;
      const task = TaskEntityMockFactory.create({
        id: taskId,
        type: TaskType.HTTP_REQUEST,
        status: TaskStatus.PENDING,
      });

      taskService.getTaskById.mockResolvedValue(task as any);
      taskService.updateTaskStatus.mockResolvedValue(task as any);
      coordinator.handleTaskCompletion.mockResolvedValue();

      const startTime = Date.now();
      await worker.handleTask({
        taskId,
        taskType: TaskType.HTTP_REQUEST,
        delay,
      });
      const endTime = Date.now();

      expect(endTime - startTime).toBeGreaterThanOrEqual(delay);
      expect(taskService.getTaskById).toHaveBeenCalledWith(taskId);
      expect(taskService.updateTaskStatus).toHaveBeenCalledWith(
        taskId,
        TaskStatus.PROCESSING,
      );
      expect(taskService.updateTaskStatus).toHaveBeenCalledWith(
        taskId,
        TaskStatus.COMPLETED,
      );
    });

    it('should handle task with metadata', async () => {
      const taskId = 'task-123';
      const metadata = { source: 'test', priority: 'high' };
      const task = TaskEntityMockFactory.create({
        id: taskId,
        type: TaskType.HTTP_REQUEST,
        status: TaskStatus.PENDING,
      });

      taskService.getTaskById.mockResolvedValue(task as any);
      taskService.updateTaskStatus.mockResolvedValue(task as any);
      coordinator.handleTaskCompletion.mockResolvedValue();

      await worker.handleTask({
        taskId,
        taskType: TaskType.HTTP_REQUEST,
        metadata,
      });

      expect(taskService.getTaskById).toHaveBeenCalledWith(taskId);
      expect(taskService.updateTaskStatus).toHaveBeenCalledWith(
        taskId,
        TaskStatus.PROCESSING,
      );
      expect(taskService.updateTaskStatus).toHaveBeenCalledWith(
        taskId,
        TaskStatus.COMPLETED,
      );
      expect(coordinator.handleTaskCompletion).toHaveBeenCalledWith(taskId);
    });

    it('should handle task processing failure', async () => {
      const taskId = 'task-123';
      const task = TaskEntityMockFactory.create({
        id: taskId,
        type: TaskType.HTTP_REQUEST,
        status: TaskStatus.PENDING,
      });
      const error = new Error('Processing failed');

      taskService.getTaskById.mockResolvedValue(task as any);
      taskService.updateTaskStatus.mockResolvedValue(task as any);
      taskService.handleFailure.mockResolvedValue();
      coordinator.handleTaskFailure.mockResolvedValue();

      jest.spyOn(worker as any, 'processTask').mockRejectedValue(error);

      await worker.handleTask({ taskId, taskType: TaskType.HTTP_REQUEST });

      expect(taskService.getTaskById).toHaveBeenCalledWith(taskId);
      expect(taskService.updateTaskStatus).toHaveBeenCalledWith(
        taskId,
        TaskStatus.PROCESSING,
      );
      expect(taskService.handleFailure).toHaveBeenCalledWith(taskId, error);
      expect(coordinator.handleTaskFailure).toHaveBeenCalledWith(taskId, error);
      expect(taskService.updateTaskStatus).not.toHaveBeenCalledWith(
        taskId,
        TaskStatus.COMPLETED,
      );
    });

    it('should handle coordinator failure gracefully', async () => {
      const taskId = 'task-123';
      const task = TaskEntityMockFactory.create({
        id: taskId,
        type: TaskType.HTTP_REQUEST,
        status: TaskStatus.PENDING,
      });
      const coordinatorError = new Error('Coordinator failed');

      taskService.getTaskById.mockResolvedValue(task as any);
      taskService.updateTaskStatus.mockResolvedValue(task as any);
      coordinator.handleTaskCompletion.mockRejectedValue(coordinatorError);

      await worker.handleTask({ taskId, taskType: TaskType.HTTP_REQUEST });

      expect(taskService.getTaskById).toHaveBeenCalledWith(taskId);
      expect(taskService.updateTaskStatus).toHaveBeenCalledWith(
        taskId,
        TaskStatus.PROCESSING,
      );
      expect(taskService.updateTaskStatus).toHaveBeenCalledWith(
        taskId,
        TaskStatus.COMPLETED,
      );
      expect(coordinator.handleTaskCompletion).toHaveBeenCalledWith(taskId);
    });

    it('should handle coordinator failure handling gracefully', async () => {
      const taskId = 'task-123';
      const task = TaskEntityMockFactory.create({
        id: taskId,
        type: TaskType.HTTP_REQUEST,
        status: TaskStatus.PENDING,
      });
      const processingError = new Error('Processing failed');
      const coordinatorError = new Error('Coordinator failed');

      taskService.getTaskById.mockResolvedValue(task as any);
      taskService.updateTaskStatus.mockResolvedValue(task as any);
      taskService.handleFailure.mockResolvedValue();
      coordinator.handleTaskFailure.mockRejectedValue(coordinatorError);

      jest
        .spyOn(worker as any, 'processTask')
        .mockRejectedValue(processingError);

      await worker.handleTask({ taskId, taskType: TaskType.HTTP_REQUEST });

      expect(taskService.getTaskById).toHaveBeenCalledWith(taskId);
      expect(taskService.updateTaskStatus).toHaveBeenCalledWith(
        taskId,
        TaskStatus.PROCESSING,
      );
      expect(taskService.handleFailure).toHaveBeenCalledWith(
        taskId,
        processingError,
      );
      expect(coordinator.handleTaskFailure).toHaveBeenCalledWith(
        taskId,
        processingError,
      );
    });
  });
});
