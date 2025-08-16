import axios from 'axios';
import { Test, TestingModule } from '@nestjs/testing';
import { TaskEntityMockFactory } from '@test/mocks';
import { HttpWorker } from '../http.worker';
import { TaskService } from '../../task/task.service';
import { CoordinatorService } from '../../workflow/coordinator.service';
import { CoordinatorFactoryService } from '../../workflow/services/coordinator-factory.service';
import { InvoiceCoordinatorService } from '../../invoice/invoice-coordinator.service';
import { TaskType } from '../../task/types/task-type.enum';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('HttpWorker', () => {
  let worker: HttpWorker;
  let taskService: jest.Mocked<TaskService>;
  let coordinator: jest.Mocked<CoordinatorService>;
  let coordinatorFactory: jest.Mocked<CoordinatorFactoryService>;
  let invoiceCoordinator: jest.Mocked<InvoiceCoordinatorService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HttpWorker,
        {
          provide: TaskService,
          useValue: {
            getTaskById: jest.fn(),
            updateTaskStatus: jest.fn(),
            updateTaskPayload: jest.fn(),
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

    worker = module.get<HttpWorker>(HttpWorker);
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
    it('should handle HTTP request task successfully', async () => {
      const taskId = 'task-123';
      const task = TaskEntityMockFactory.create({
        id: taskId,
        type: TaskType.HTTP_REQUEST,
        payload: {
          url: 'https://api.example.com',
          method: 'GET',
        },
      });

      taskService.getTaskById.mockResolvedValue(task as any);
      taskService.updateTaskStatus.mockResolvedValue(task as any);
      coordinator.handleTaskCompletion.mockResolvedValue();
      (mockedAxios as any).mockResolvedValue({ status: 200 });

      await worker.handleTask({ taskId, taskType: TaskType.HTTP_REQUEST });

      expect(taskService.getTaskById).toHaveBeenCalledWith(taskId);
      expect(mockedAxios).toHaveBeenCalledWith({
        method: 'GET',
        url: 'https://api.example.com',
        timeout: 10000,
      });
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

    it('should handle different HTTP methods', async () => {
      const taskId = 'task-123';
      const task = TaskEntityMockFactory.create({
        id: taskId,
        type: TaskType.HTTP_REQUEST,
        payload: {
          url: 'https://api.example.com',
          method: 'POST',
        },
      });

      taskService.getTaskById.mockResolvedValue(task as any);
      taskService.updateTaskStatus.mockResolvedValue(task as any);
      coordinator.handleTaskCompletion.mockResolvedValue();
      (mockedAxios as any).mockResolvedValue({ status: 201 });

      await worker.handleTask({ taskId, taskType: TaskType.HTTP_REQUEST });

      expect(mockedAxios).toHaveBeenCalledWith({
        method: 'POST',
        url: 'https://api.example.com',
        timeout: 10000,
      });
    });
  });

  describe('processTask', () => {
    it('should process HTTP request successfully', async () => {
      const taskId = 'task-123';
      const task = TaskEntityMockFactory.create({
        id: taskId,
        type: TaskType.HTTP_REQUEST,
        payload: {
          url: 'https://api.example.com',
          method: 'GET',
        },
      });

      taskService.getTaskById.mockResolvedValue(task as any);
      (mockedAxios as any).mockResolvedValue({ status: 200 });

      await (worker as any).processTask(taskId);

      expect(taskService.getTaskById).toHaveBeenCalledWith(taskId);
      expect(mockedAxios).toHaveBeenCalledWith({
        method: 'GET',
        url: 'https://api.example.com',
        timeout: 10000,
      });
    });

    it('should throw error when task not found', async () => {
      const taskId = 'non-existent-task';

      taskService.getTaskById.mockResolvedValue(null);

      await expect((worker as any).processTask(taskId)).rejects.toThrow(
        `Task with id ${taskId} not found`,
      );

      expect(taskService.getTaskById).toHaveBeenCalledWith(taskId);
      expect(mockedAxios).not.toHaveBeenCalled();
    });

    it('should throw error when URL is missing', async () => {
      const taskId = 'task-123';
      const task = TaskEntityMockFactory.create({
        id: taskId,
        type: TaskType.HTTP_REQUEST,
        payload: {
          method: 'GET',
        },
      });

      taskService.getTaskById.mockResolvedValue(task as any);

      await expect((worker as any).processTask(taskId)).rejects.toThrow(
        'URL and method are required for HTTP tasks',
      );

      expect(taskService.getTaskById).toHaveBeenCalledWith(taskId);
      expect(mockedAxios).not.toHaveBeenCalled();
    });

    it('should throw error when method is missing', async () => {
      const taskId = 'task-123';
      const task = TaskEntityMockFactory.create({
        id: taskId,
        type: TaskType.HTTP_REQUEST,
        payload: {
          url: 'https://api.example.com',
        },
      });

      taskService.getTaskById.mockResolvedValue(task as any);

      await expect((worker as any).processTask(taskId)).rejects.toThrow(
        'URL and method are required for HTTP tasks',
      );

      expect(taskService.getTaskById).toHaveBeenCalledWith(taskId);
      expect(mockedAxios).not.toHaveBeenCalled();
    });

    it('should throw error when HTTP request fails with 4xx status', async () => {
      const taskId = 'task-123';
      const task = TaskEntityMockFactory.create({
        id: taskId,
        type: TaskType.HTTP_REQUEST,
        payload: {
          url: 'https://api.example.com',
          method: 'GET',
        },
      });

      taskService.getTaskById.mockResolvedValue(task as any);
      (mockedAxios as any).mockResolvedValue({ status: 404 });

      await expect((worker as any).processTask(taskId)).rejects.toThrow(
        'HTTP 404',
      );

      expect(taskService.getTaskById).toHaveBeenCalledWith(taskId);
      expect(mockedAxios).toHaveBeenCalledWith({
        method: 'GET',
        url: 'https://api.example.com',
        timeout: 10000,
      });
    });

    it('should throw error when HTTP request fails with 5xx status', async () => {
      const taskId = 'task-123';
      const task = TaskEntityMockFactory.create({
        id: taskId,
        type: TaskType.HTTP_REQUEST,
        payload: {
          url: 'https://api.example.com',
          method: 'GET',
        },
      });

      taskService.getTaskById.mockResolvedValue(task as any);
      (mockedAxios as any).mockResolvedValue({ status: 500 });

      await expect((worker as any).processTask(taskId)).rejects.toThrow(
        'HTTP 500',
      );

      expect(taskService.getTaskById).toHaveBeenCalledWith(taskId);
      expect(mockedAxios).toHaveBeenCalledWith({
        method: 'GET',
        url: 'https://api.example.com',
        timeout: 10000,
      });
    });

    it('should handle axios network errors', async () => {
      const taskId = 'task-123';
      const task = TaskEntityMockFactory.create({
        id: taskId,
        type: TaskType.HTTP_REQUEST,
        payload: {
          url: 'https://api.example.com',
          method: 'GET',
        },
      });

      taskService.getTaskById.mockResolvedValue(task as any);
      const networkError = new Error('Network Error');
      (mockedAxios as any).mockRejectedValue(networkError);

      await expect((worker as any).processTask(taskId)).rejects.toThrow(
        'Network Error',
      );

      expect(taskService.getTaskById).toHaveBeenCalledWith(taskId);
      expect(mockedAxios).toHaveBeenCalledWith({
        method: 'GET',
        url: 'https://api.example.com',
        timeout: 10000,
      });
    });
  });

  describe('shouldProcessTaskType', () => {
    it('should return true for HTTP_REQUEST task type', () => {
      expect((worker as any).shouldProcessTaskType(TaskType.HTTP_REQUEST)).toBe(
        true,
      );
    });

    it('should return false for other task types', () => {
      expect(
        (worker as any).shouldProcessTaskType(TaskType.DATA_PROCESSING),
      ).toBe(false);
      expect((worker as any).shouldProcessTaskType(TaskType.COMPENSATION)).toBe(
        false,
      );
    });
  });
});
