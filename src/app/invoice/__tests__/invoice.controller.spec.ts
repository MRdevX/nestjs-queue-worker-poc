import { Test, TestingModule } from '@nestjs/testing';
import { TaskEntityMockFactory } from '@test/mocks';
import { InvoiceController } from '../invoice.controller';
import { TaskService } from '../../task/task.service';
import { MessagingService } from '../../core/messaging/messaging.service';
import { SchedulerService } from '../../scheduler/scheduler.service';
import { TaskType } from '../../task/types/task-type.enum';
import { TaskStatus } from '../../task/types/task-status.enum';

describe('InvoiceController', () => {
  let controller: InvoiceController;
  let taskService: jest.Mocked<TaskService>;
  let messagingService: jest.Mocked<MessagingService>;
  let schedulerService: jest.Mocked<SchedulerService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvoiceController],
      providers: [
        {
          provide: TaskService,
          useValue: {
            createTask: jest.fn(),
            findMany: jest.fn(),
          },
        },
        {
          provide: MessagingService,
          useValue: {
            publishTask: jest.fn(),
          },
        },
        {
          provide: SchedulerService,
          useValue: {
            createScheduledTask: jest.fn(),
            createRecurringTask: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<InvoiceController>(InvoiceController);
    taskService = module.get(TaskService);
    messagingService = module.get(MessagingService);
    schedulerService = module.get(SchedulerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('startInvoiceWorkflow', () => {
    it('should start invoice workflow successfully', async () => {
      const dto = {
        customerId: 'customer-123',
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31',
        workflowId: 'workflow-123',
      };

      const mockTask = TaskEntityMockFactory.create({
        id: 'task-123',
        type: TaskType.FETCH_ORDERS,
        payload: dto,
      });

      taskService.createTask.mockResolvedValue(mockTask as any);
      messagingService.publishTask.mockResolvedValue();

      const result = await controller.startInvoiceWorkflow(dto);

      expect(taskService.createTask).toHaveBeenCalledWith(
        TaskType.FETCH_ORDERS,
        {
          customerId: dto.customerId,
          dateFrom: dto.dateFrom,
          dateTo: dto.dateTo,
        },
        dto.workflowId,
      );
      expect(messagingService.publishTask).toHaveBeenCalledWith(
        TaskType.FETCH_ORDERS,
        mockTask.id,
      );
      expect(result).toEqual({
        message: 'Invoice workflow started',
        taskId: mockTask.id,
        workflowId: dto.workflowId,
      });
    });

    it('should start invoice workflow without workflow ID', async () => {
      const dto = {
        customerId: 'customer-123',
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31',
      };

      const mockTask = TaskEntityMockFactory.create({
        id: 'task-123',
        type: TaskType.FETCH_ORDERS,
        payload: dto,
      });

      taskService.createTask.mockResolvedValue(mockTask as any);
      messagingService.publishTask.mockResolvedValue();

      const result = await controller.startInvoiceWorkflow(dto);

      expect(taskService.createTask).toHaveBeenCalledWith(
        TaskType.FETCH_ORDERS,
        {
          customerId: dto.customerId,
          dateFrom: dto.dateFrom,
          dateTo: dto.dateTo,
        },
        undefined,
      );
      expect(result.workflowId).toBeUndefined();
    });
  });

  describe('createScheduledInvoiceWorkflow', () => {
    it('should create scheduled invoice workflow successfully', async () => {
      const dto = {
        customerId: 'customer-123',
        scheduledAt: '2024-01-15T10:00:00Z',
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31',
        workflowId: 'workflow-123',
      };

      const mockTask = TaskEntityMockFactory.create({
        id: 'task-123',
        type: TaskType.FETCH_ORDERS,
        payload: dto,
      });

      schedulerService.createScheduledTask.mockResolvedValue(mockTask as any);

      const result = await controller.createScheduledInvoiceWorkflow(dto);

      expect(schedulerService.createScheduledTask).toHaveBeenCalledWith(
        TaskType.FETCH_ORDERS,
        {
          customerId: dto.customerId,
          dateFrom: dto.dateFrom,
          dateTo: dto.dateTo,
        },
        new Date(dto.scheduledAt),
        dto.workflowId,
      );
      expect(result).toEqual({
        message: 'Scheduled invoice workflow created',
        taskId: mockTask.id,
        scheduledAt: new Date(dto.scheduledAt).toISOString(),
        workflowId: dto.workflowId,
      });
    });

    it('should throw error for invalid scheduledAt date', async () => {
      const dto = {
        customerId: 'customer-123',
        scheduledAt: 'invalid-date',
        workflowId: 'workflow-123',
      };

      await expect(
        controller.createScheduledInvoiceWorkflow(dto),
      ).rejects.toThrow('Invalid scheduledAt date');

      expect(schedulerService.createScheduledTask).not.toHaveBeenCalled();
    });
  });

  describe('createRecurringInvoiceWorkflow', () => {
    it('should create recurring invoice workflow successfully', async () => {
      const dto = {
        customerId: 'customer-123',
        cronExpression: '0 0 * * *',
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31',
        workflowId: 'workflow-123',
      };

      const mockTask = TaskEntityMockFactory.create({
        id: 'task-123',
        type: TaskType.FETCH_ORDERS,
        payload: dto,
      });

      schedulerService.createRecurringTask.mockResolvedValue(mockTask as any);

      const result = await controller.createRecurringInvoiceWorkflow(dto);

      expect(schedulerService.createRecurringTask).toHaveBeenCalledWith(
        TaskType.FETCH_ORDERS,
        {
          customerId: dto.customerId,
          dateFrom: dto.dateFrom,
          dateTo: dto.dateTo,
        },
        dto.cronExpression,
        dto.workflowId,
      );
      expect(result).toEqual({
        message: 'Recurring invoice workflow created',
        taskId: mockTask.id,
        cronExpression: dto.cronExpression,
        workflowId: dto.workflowId,
      });
    });
  });

  describe('createScheduledEmailWorkflow', () => {
    it('should create scheduled email workflow successfully', async () => {
      const dto = {
        customerId: 'customer-123',
        invoiceId: 'invoice-123',
        scheduledAt: '2024-01-15T10:00:00Z',
        workflowId: 'workflow-123',
      };

      const mockTask = TaskEntityMockFactory.create({
        id: 'task-123',
        type: TaskType.SEND_EMAIL,
        payload: dto,
      });

      schedulerService.createScheduledTask.mockResolvedValue(mockTask as any);

      const result = await controller.createScheduledEmailWorkflow(dto);

      expect(schedulerService.createScheduledTask).toHaveBeenCalledWith(
        TaskType.SEND_EMAIL,
        {
          customerId: dto.customerId,
          invoiceId: dto.invoiceId,
        },
        new Date(dto.scheduledAt),
        dto.workflowId,
      );
      expect(result).toEqual({
        message: 'Scheduled email workflow created',
        taskId: mockTask.id,
        scheduledAt: new Date(dto.scheduledAt).toISOString(),
        workflowId: dto.workflowId,
      });
    });
  });

  describe('getCustomerInvoiceTasks', () => {
    it('should return customer invoice tasks', async () => {
      const customerId = 'customer-123';
      const mockTasks = [
        TaskEntityMockFactory.create({
          id: 'task-1',
          type: TaskType.FETCH_ORDERS,
          status: TaskStatus.COMPLETED,
          createdAt: new Date('2024-01-15T10:00:00Z'),
          updatedAt: new Date('2024-01-15T10:05:00Z'),
        }),
        TaskEntityMockFactory.create({
          id: 'task-2',
          type: TaskType.CREATE_INVOICE,
          status: TaskStatus.PENDING,
          createdAt: new Date('2024-01-15T10:06:00Z'),
        }),
      ];

      taskService.findMany.mockResolvedValue(mockTasks as any);

      const result = await controller.getCustomerInvoiceTasks(customerId);

      expect(taskService.findMany).toHaveBeenCalledWith({
        payload: { customerId },
      });
      expect(result).toEqual({
        customerId,
        tasks: [
          {
            id: 'task-1',
            type: TaskType.FETCH_ORDERS,
            status: TaskStatus.COMPLETED,
            createdAt: mockTasks[0].createdAt,
            completedAt: mockTasks[0].updatedAt,
          },
          {
            id: 'task-2',
            type: TaskType.CREATE_INVOICE,
            status: TaskStatus.PENDING,
            createdAt: mockTasks[1].createdAt,
            completedAt: null,
          },
        ],
      });
    });
  });

  describe('getInvoiceWorkflowStatus', () => {
    it('should return invoice workflow status', async () => {
      const customerId = 'customer-123';
      const mockTasks = [
        TaskEntityMockFactory.create({
          id: 'task-1',
          type: TaskType.FETCH_ORDERS,
          status: TaskStatus.COMPLETED,
          workflow: { id: 'workflow-123' },
        }),
        TaskEntityMockFactory.create({
          id: 'task-2',
          type: TaskType.CREATE_INVOICE,
          status: TaskStatus.PENDING,
          workflow: { id: 'workflow-123' },
        }),
        TaskEntityMockFactory.create({
          id: 'task-3',
          type: TaskType.SEND_EMAIL,
          status: TaskStatus.FAILED,
          workflow: null, // standalone task
        }),
      ];

      taskService.findMany.mockResolvedValue(mockTasks as any);

      const result = await controller.getInvoiceWorkflowStatus(customerId);

      expect(taskService.findMany).toHaveBeenCalledWith({
        payload: { customerId },
      });
      expect(result).toEqual({
        customerId,
        totalTasks: 3,
        completedTasks: 1,
        failedTasks: 1,
        pendingTasks: 1,
        processingTasks: 0,
        workflows: {
          'workflow-123': {
            totalTasks: 2,
            completedTasks: 1,
            failedTasks: 0,
            isComplete: false,
          },
          standalone: {
            totalTasks: 1,
            completedTasks: 0,
            failedTasks: 1,
            isComplete: true,
          },
        },
      });
    });
  });
});
