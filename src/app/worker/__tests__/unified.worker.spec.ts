import { Test, TestingModule } from '@nestjs/testing';
import { TaskEntityMockFactory } from '@test/mocks';
import { UnifiedWorker } from '../unified.worker';
import { TaskProcessorService } from '../task-processor.service';
import { TaskService } from '../../task/task.service';
import { CoordinatorService } from '../../workflow/services/coordinator.service';
import { CoordinatorFactoryService } from '../../workflow/services/coordinator-factory.service';
import { InvoiceCoordinatorService } from '../../invoice/invoice-coordinator.service';
import { TaskType } from '../../task/types/task-type.enum';
import { TaskStatus } from '../../task/types/task-status.enum';

describe('UnifiedWorker', () => {
  let worker: UnifiedWorker;
  let taskProcessor: jest.Mocked<TaskProcessorService>;
  let taskService: jest.Mocked<TaskService>;
  let coordinator: jest.Mocked<CoordinatorService>;
  let coordinatorFactory: jest.Mocked<CoordinatorFactoryService>;
  let invoiceCoordinator: jest.Mocked<InvoiceCoordinatorService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnifiedWorker,
        {
          provide: TaskProcessorService,
          useValue: {
            processHttpRequest: jest.fn(),
            processDataProcessing: jest.fn(),
            processCompensation: jest.fn(),
            processFetchOrders: jest.fn(),
            processCreateInvoice: jest.fn(),
            processGeneratePdf: jest.fn(),
            processSendEmail: jest.fn(),
          },
        },
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

    worker = module.get<UnifiedWorker>(UnifiedWorker);
    taskProcessor = module.get(TaskProcessorService);
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

  describe('processTask', () => {
    it('should process HTTP request task', async () => {
      const taskId = 'task-123';
      const task = TaskEntityMockFactory.create({
        id: taskId,
        type: TaskType.HTTP_REQUEST,
        status: TaskStatus.PENDING,
      });

      taskService.getTaskById.mockResolvedValue(task as any);
      taskProcessor.processHttpRequest.mockResolvedValue();

      await (worker as any).processTask(taskId);

      expect(taskService.getTaskById).toHaveBeenCalledWith(taskId);
      expect(taskProcessor.processHttpRequest).toHaveBeenCalledWith(taskId);
    });

    it('should process data processing task', async () => {
      const taskId = 'task-123';
      const task = TaskEntityMockFactory.create({
        id: taskId,
        type: TaskType.DATA_PROCESSING,
        status: TaskStatus.PENDING,
      });

      taskService.getTaskById.mockResolvedValue(task as any);
      taskProcessor.processDataProcessing.mockResolvedValue();

      await (worker as any).processTask(taskId);

      expect(taskService.getTaskById).toHaveBeenCalledWith(taskId);
      expect(taskProcessor.processDataProcessing).toHaveBeenCalledWith(taskId);
    });

    it('should process compensation task', async () => {
      const taskId = 'task-123';
      const task = TaskEntityMockFactory.create({
        id: taskId,
        type: TaskType.COMPENSATION,
        status: TaskStatus.PENDING,
      });

      taskService.getTaskById.mockResolvedValue(task as any);
      taskProcessor.processCompensation.mockResolvedValue();

      await (worker as any).processTask(taskId);

      expect(taskService.getTaskById).toHaveBeenCalledWith(taskId);
      expect(taskProcessor.processCompensation).toHaveBeenCalledWith(taskId);
    });

    it('should process fetch orders task', async () => {
      const taskId = 'task-123';
      const task = TaskEntityMockFactory.create({
        id: taskId,
        type: TaskType.FETCH_ORDERS,
        status: TaskStatus.PENDING,
      });

      taskService.getTaskById.mockResolvedValue(task as any);
      taskProcessor.processFetchOrders.mockResolvedValue();

      await (worker as any).processTask(taskId);

      expect(taskService.getTaskById).toHaveBeenCalledWith(taskId);
      expect(taskProcessor.processFetchOrders).toHaveBeenCalledWith(taskId);
    });

    it('should process create invoice task', async () => {
      const taskId = 'task-123';
      const task = TaskEntityMockFactory.create({
        id: taskId,
        type: TaskType.CREATE_INVOICE,
        status: TaskStatus.PENDING,
      });

      taskService.getTaskById.mockResolvedValue(task as any);
      taskProcessor.processCreateInvoice.mockResolvedValue();

      await (worker as any).processTask(taskId);

      expect(taskService.getTaskById).toHaveBeenCalledWith(taskId);
      expect(taskProcessor.processCreateInvoice).toHaveBeenCalledWith(taskId);
    });

    it('should process generate PDF task', async () => {
      const taskId = 'task-123';
      const task = TaskEntityMockFactory.create({
        id: taskId,
        type: TaskType.GENERATE_PDF,
        status: TaskStatus.PENDING,
      });

      taskService.getTaskById.mockResolvedValue(task as any);
      taskProcessor.processGeneratePdf.mockResolvedValue();

      await (worker as any).processTask(taskId);

      expect(taskService.getTaskById).toHaveBeenCalledWith(taskId);
      expect(taskProcessor.processGeneratePdf).toHaveBeenCalledWith(taskId);
    });

    it('should process send email task', async () => {
      const taskId = 'task-123';
      const task = TaskEntityMockFactory.create({
        id: taskId,
        type: TaskType.SEND_EMAIL,
        status: TaskStatus.PENDING,
      });

      taskService.getTaskById.mockResolvedValue(task as any);
      taskProcessor.processSendEmail.mockResolvedValue();

      await (worker as any).processTask(taskId);

      expect(taskService.getTaskById).toHaveBeenCalledWith(taskId);
      expect(taskProcessor.processSendEmail).toHaveBeenCalledWith(taskId);
    });

    it('should throw error for unsupported task type', async () => {
      const taskId = 'task-123';
      const task = TaskEntityMockFactory.create({
        id: taskId,
        type: 'UNSUPPORTED' as TaskType,
        status: TaskStatus.PENDING,
      });

      taskService.getTaskById.mockResolvedValue(task as any);

      await expect((worker as any).processTask(taskId)).rejects.toThrow(
        'Unsupported task type: UNSUPPORTED',
      );
    });
  });

  describe('shouldProcessTaskType', () => {
    it('should return true for all supported task types', () => {
      expect((worker as any).shouldProcessTaskType(TaskType.HTTP_REQUEST)).toBe(
        true,
      );
      expect(
        (worker as any).shouldProcessTaskType(TaskType.DATA_PROCESSING),
      ).toBe(true);
      expect((worker as any).shouldProcessTaskType(TaskType.COMPENSATION)).toBe(
        true,
      );
      expect((worker as any).shouldProcessTaskType(TaskType.FETCH_ORDERS)).toBe(
        true,
      );
      expect(
        (worker as any).shouldProcessTaskType(TaskType.CREATE_INVOICE),
      ).toBe(true);
      expect((worker as any).shouldProcessTaskType(TaskType.GENERATE_PDF)).toBe(
        true,
      );
      expect((worker as any).shouldProcessTaskType(TaskType.SEND_EMAIL)).toBe(
        true,
      );
    });
  });
});
