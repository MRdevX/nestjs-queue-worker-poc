import { Test, TestingModule } from '@nestjs/testing';
import { InvoiceServiceMockFactory } from '@test/mocks';
import { InvoiceController } from '../invoice.controller';
import { InvoiceService } from '../invoice.service';

describe('InvoiceController', () => {
  let controller: InvoiceController;
  let invoiceService: jest.Mocked<InvoiceService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvoiceController],
      providers: [
        {
          provide: InvoiceService,
          useValue: InvoiceServiceMockFactory.createWithDefaults(),
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

  describe('getCustomerInvoiceTasks', () => {
    it('should return customer invoice tasks', async () => {
      const customerId = 'customer-123';
      const expectedResult = {
        customerId,
        tasks: [
          {
            id: 'task-1',
            type: 'FETCH_ORDERS',
            status: 'COMPLETED',
            createdAt: new Date('2024-01-15T10:00:00Z'),
            completedAt: new Date('2024-01-15T10:05:00Z'),
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
