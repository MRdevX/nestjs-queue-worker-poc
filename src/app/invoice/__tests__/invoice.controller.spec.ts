import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TaskEntityMockFactory } from '@test/mocks';
import { InvoiceController } from '../invoice.controller';
import { InvoiceService } from '../invoice.service';
import { TaskService } from '../../task/task.service';
import { MessagingService } from '../../core/messaging/messaging.service';
import { SchedulerService } from '../../scheduler/scheduler.service';
import { TaskType } from '../../task/types/task-type.enum';
import { TaskStatus } from '../../task/types/task-status.enum';

describe('InvoiceController', () => {
  let controller: InvoiceController;
  let invoiceService: jest.Mocked<InvoiceService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvoiceController],
      providers: [
        {
          provide: InvoiceService,
          useValue: {
            startInvoiceWorkflow: jest.fn(),
            createScheduledInvoiceWorkflow: jest.fn(),
            createRecurringInvoiceWorkflow: jest.fn(),
            createScheduledEmailWorkflow: jest.fn(),
            getCustomerInvoiceTasks: jest.fn(),
            getInvoiceWorkflowStatus: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<InvoiceController>(InvoiceController);
    invoiceService = module.get(InvoiceService);
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

      const expectedResult = {
        message: 'Invoice workflow started',
        taskId: 'task-123',
        workflowId: dto.workflowId,
      };

      invoiceService.startInvoiceWorkflow.mockResolvedValue(expectedResult);

      const result = await controller.startInvoiceWorkflow(dto);

      expect(invoiceService.startInvoiceWorkflow).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expectedResult);
    });

    it('should start invoice workflow without workflow ID', async () => {
      const dto = {
        customerId: 'customer-123',
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31',
      };

      const expectedResult = {
        message: 'Invoice workflow started',
        taskId: 'task-123',
        workflowId: undefined,
      };

      invoiceService.startInvoiceWorkflow.mockResolvedValue(expectedResult);

      const result = await controller.startInvoiceWorkflow(dto);

      expect(invoiceService.startInvoiceWorkflow).toHaveBeenCalledWith(dto);
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

      const expectedResult = {
        message: 'Scheduled invoice workflow created',
        taskId: 'task-123',
        scheduledAt: new Date(dto.scheduledAt).toISOString(),
        workflowId: dto.workflowId,
      };

      invoiceService.createScheduledInvoiceWorkflow.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.createScheduledInvoiceWorkflow(dto);

      expect(
        invoiceService.createScheduledInvoiceWorkflow,
      ).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expectedResult);
    });

    it('should throw error for invalid scheduledAt date', async () => {
      const dto = {
        customerId: 'customer-123',
        scheduledAt: 'invalid-date',
        workflowId: 'workflow-123',
      };

      const error = new Error('Invalid scheduledAt date');
      invoiceService.createScheduledInvoiceWorkflow.mockRejectedValue(error);

      await expect(
        controller.createScheduledInvoiceWorkflow(dto),
      ).rejects.toThrow('Invalid scheduledAt date');

      expect(
        invoiceService.createScheduledInvoiceWorkflow,
      ).toHaveBeenCalledWith(dto);
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

      const expectedResult = {
        message: 'Recurring invoice workflow created',
        taskId: 'task-123',
        cronExpression: dto.cronExpression,
        workflowId: dto.workflowId,
      };

      invoiceService.createRecurringInvoiceWorkflow.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.createRecurringInvoiceWorkflow(dto);

      expect(
        invoiceService.createRecurringInvoiceWorkflow,
      ).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expectedResult);
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

      const expectedResult = {
        message: 'Scheduled email workflow created',
        taskId: 'task-123',
        scheduledAt: new Date(dto.scheduledAt).toISOString(),
        workflowId: dto.workflowId,
      };

      invoiceService.createScheduledEmailWorkflow.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.createScheduledEmailWorkflow(dto);

      expect(invoiceService.createScheduledEmailWorkflow).toHaveBeenCalledWith(
        dto,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getCustomerInvoiceTasks', () => {
    it('should return customer invoice tasks', async () => {
      const customerId = 'customer-123';
      const expectedResult = {
        customerId,
        tasks: [
          {
            id: 'task-1',
            type: TaskType.FETCH_ORDERS,
            status: TaskStatus.COMPLETED,
            createdAt: new Date('2024-01-15T10:00:00Z'),
            completedAt: new Date('2024-01-15T10:05:00Z'),
          },
          {
            id: 'task-2',
            type: TaskType.CREATE_INVOICE,
            status: TaskStatus.PENDING,
            createdAt: new Date('2024-01-15T10:06:00Z'),
            completedAt: null,
          },
        ],
      };

      invoiceService.getCustomerInvoiceTasks.mockResolvedValue(expectedResult);

      const result = await controller.getCustomerInvoiceTasks(customerId);

      expect(invoiceService.getCustomerInvoiceTasks).toHaveBeenCalledWith(
        customerId,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getInvoiceWorkflowStatus', () => {
    it('should return invoice workflow status', async () => {
      const customerId = 'customer-123';
      const expectedResult = {
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
      };

      invoiceService.getInvoiceWorkflowStatus.mockResolvedValue(expectedResult);

      const result = await controller.getInvoiceWorkflowStatus(customerId);

      expect(invoiceService.getInvoiceWorkflowStatus).toHaveBeenCalledWith(
        customerId,
      );
      expect(result).toEqual(expectedResult);
    });
  });
});
