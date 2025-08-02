import { Test, TestingModule } from '@nestjs/testing';
import { TaskEntityMockFactory } from '@test/mocks';
import { FetchOrdersWorker } from '../fetch-orders.worker';
import { TaskService } from '../../task/task.service';
import { CoordinatorService } from '../../workflow/coordinator.service';
import { TaskType } from '../../task/types/task-type.enum';
import { TaskStatus } from '../../task/types/task-status.enum';

describe('FetchOrdersWorker', () => {
  let worker: FetchOrdersWorker;
  let taskService: jest.Mocked<TaskService>;
  let coordinator: jest.Mocked<CoordinatorService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FetchOrdersWorker,
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

    worker = module.get<FetchOrdersWorker>(FetchOrdersWorker);
    taskService = module.get(TaskService);
    coordinator = module.get(CoordinatorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleTask', () => {
    it('should process fetch orders task successfully', async () => {
      const taskId = 'task-123';
      const mockTask = TaskEntityMockFactory.create({
        id: taskId,
        type: TaskType.FETCH_ORDERS,
        payload: {
          customerId: 'customer-123',
          dateFrom: '2024-01-01',
          dateTo: '2024-01-31',
        },
        status: TaskStatus.PENDING,
      });

      taskService.getTaskById.mockResolvedValue(mockTask as any);
      taskService.updateTaskStatus.mockResolvedValue(mockTask as any);

      const message = {
        taskType: TaskType.FETCH_ORDERS,
        taskId,
        delay: undefined,
        metadata: undefined,
      };

      await worker.handleTask(message);

      expect(taskService.getTaskById).toHaveBeenCalledWith(taskId);
      expect(taskService.updateTaskStatus).toHaveBeenCalledWith(
        taskId,
        TaskStatus.PROCESSING,
      );
      expect(coordinator.handleTaskCompletion).toHaveBeenCalledWith(taskId);
    });

    it('should handle missing customer ID', async () => {
      const taskId = 'task-123';
      const mockTask = TaskEntityMockFactory.create({
        id: taskId,
        type: TaskType.FETCH_ORDERS,
        payload: {
          // Missing customerId
          dateFrom: '2024-01-01',
        },
        status: TaskStatus.PENDING,
      });

      taskService.getTaskById.mockResolvedValue(mockTask as any);
      taskService.handleFailure.mockResolvedValue();

      const message = {
        taskType: TaskType.FETCH_ORDERS,
        taskId,
        delay: undefined,
        metadata: undefined,
      };

      await worker.handleTask(message);

      expect(taskService.getTaskById).toHaveBeenCalledWith(taskId);
      expect(taskService.handleFailure).toHaveBeenCalledWith(
        taskId,
        expect.any(Error),
      );
      expect(coordinator.handleTaskFailure).toHaveBeenCalledWith(
        taskId,
        expect.any(Error),
      );
    });

    it('should handle task not found', async () => {
      const taskId = 'non-existent-task';
      taskService.getTaskById.mockResolvedValue(null);

      const message = {
        taskType: TaskType.FETCH_ORDERS,
        taskId,
        delay: undefined,
        metadata: undefined,
      };

      await worker.handleTask(message);

      expect(taskService.getTaskById).toHaveBeenCalledWith(taskId);
      expect(coordinator.handleTaskCompletion).not.toHaveBeenCalled();
      expect(coordinator.handleTaskFailure).not.toHaveBeenCalled();
    });
  });

  describe('shouldProcessTaskType', () => {
    it('should return true for FETCH_ORDERS task type', () => {
      const result = (worker as any).shouldProcessTaskType(
        TaskType.FETCH_ORDERS,
      );
      expect(result).toBe(true);
    });

    it('should return false for other task types', () => {
      const result = (worker as any).shouldProcessTaskType(
        TaskType.HTTP_REQUEST,
      );
      expect(result).toBe(false);
    });
  });

  describe('fetchOrdersFromNinox', () => {
    it('should fetch orders for customer', async () => {
      const customerId = 'customer-123';
      const orders = await (worker as any).fetchOrdersFromNinox(customerId);

      expect(orders).toHaveLength(3);
      expect(orders[0].customerId).toBe(customerId);
      expect(orders[0].status).toBe('delivered');
      expect(orders[0].invoiced).toBe(false);
    });

    it('should filter orders by date range', async () => {
      const customerId = 'customer-123';
      const dateFrom = '2024-01-16';
      const dateTo = '2024-01-31';

      const orders = await (worker as any).fetchOrdersFromNinox(
        customerId,
        dateFrom,
        dateTo,
      );

      // Should only include orders delivered on or after 2024-01-16
      expect(orders).toHaveLength(1);
      expect(orders[0].deliveryDate).toBe('2024-01-16');
    });

    it('should filter orders by date from', async () => {
      const customerId = 'customer-123';
      const dateFrom = '2024-01-16';

      const orders = await (worker as any).fetchOrdersFromNinox(
        customerId,
        dateFrom,
      );

      // Should only include orders delivered on or after 2024-01-16
      expect(orders).toHaveLength(1);
      expect(orders[0].deliveryDate).toBe('2024-01-16');
    });

    it('should filter orders by date to', async () => {
      const customerId = 'customer-123';
      const dateTo = '2024-01-15';

      const orders = await (worker as any).fetchOrdersFromNinox(
        customerId,
        undefined,
        dateTo,
      );

      // Should only include orders delivered on or before 2024-01-15
      expect(orders).toHaveLength(1);
      expect(orders[0].deliveryDate).toBe('2024-01-15');
    });
  });
});
