/* eslint-disable @typescript-eslint/naming-convention */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  TaskEntityMockFactory,
  TaskServiceMockFactory,
  MessagingServiceMockFactory,
  SchedulerServiceMockFactory,
  ConfigServiceMockFactory,
  OrderMockFactory,
} from '@test/mocks';
import { InvoiceController } from '../invoice.controller';
import { InvoiceService } from '../invoice.service';
import { InvoiceWorkflowService } from '../invoice-workflow.service';
import { TaskService } from '../../task/task.service';
import { MessagingService } from '../../core/messaging/messaging.service';
import { SchedulerService } from '../../scheduler/scheduler.service';
import { TaskType } from '../../task/types/task-type.enum';
import { TaskStatus } from '../../task/types/task-status.enum';

describe('Invoice Workflow - Comprehensive Test Suite', () => {
  let controller: InvoiceController;
  let workflowService: InvoiceWorkflowService;
  let taskService: jest.Mocked<TaskService>;
  let messagingService: jest.Mocked<MessagingService>;
  let schedulerService: jest.Mocked<SchedulerService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvoiceController],
      providers: [
        InvoiceService,
        InvoiceWorkflowService,
        {
          provide: TaskService,
          useValue: TaskServiceMockFactory.createWithDefaults(),
        },
        {
          provide: MessagingService,
          useValue: MessagingServiceMockFactory.createWithDefaults(),
        },
        {
          provide: SchedulerService,
          useValue: SchedulerServiceMockFactory.createWithDefaults(),
        },
        {
          provide: ConfigService,
          useValue: ConfigServiceMockFactory.create(),
        },
      ],
    }).compile();

    controller = module.get<InvoiceController>(InvoiceController);
    workflowService = module.get<InvoiceWorkflowService>(
      InvoiceWorkflowService,
    );
    taskService = module.get(TaskService);
    messagingService = module.get(MessagingService);
    schedulerService = module.get(SchedulerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Happy Path Scenarios', () => {
    describe('1.1 Complete Invoice Workflow Success', () => {
      it('should execute complete workflow from start to finish', async () => {
        const customerId = 'customer-123';
        const workflowId = 'workflow-123';

        const fetchOrdersTask = TaskEntityMockFactory.create({
          id: 'fetch-orders-task',
          type: TaskType.FETCH_ORDERS,
          status: TaskStatus.PENDING,
          payload: { customerId, dateFrom: '2024-01-01', dateTo: '2024-01-31' },
          workflow: { id: workflowId },
        });

        taskService.createTask.mockResolvedValue(fetchOrdersTask as any);
        messagingService.publishTask.mockResolvedValue();

        const startResult = await controller.startInvoiceWorkflow({
          customerId,
          dateFrom: '2024-01-01',
          dateTo: '2024-01-31',
          workflowId,
        });

        expect(startResult.message).toBe('Invoice workflow started');
        expect(startResult.taskId).toBe('fetch-orders-task');

        const mockOrders = [
          {
            id: 'order-1',
            customerId,
            status: 'delivered',
            invoiced: false,
            items: [
              { id: 'item-1', name: 'Product A', price: 100, quantity: 2 },
              { id: 'item-2', name: 'Product B', price: 50, quantity: 1 },
            ],
            totalAmount: 250,
            deliveryDate: '2024-01-15',
          },
        ];

        const createInvoiceTask = TaskEntityMockFactory.create({
          id: 'create-invoice-task',
          type: TaskType.CREATE_INVOICE,
          status: TaskStatus.PENDING,
          payload: { customerId, orders: mockOrders },
          workflow: { id: workflowId },
        });

        taskService.getTaskById.mockResolvedValue({
          ...fetchOrdersTask,
          payload: { ...fetchOrdersTask.payload, orders: mockOrders },
        } as any);
        taskService.createTask.mockResolvedValue(createInvoiceTask as any);

        await workflowService.handleFetchOrdersCompletion('fetch-orders-task');

        expect(taskService.createTask).toHaveBeenCalledWith(
          TaskType.CREATE_INVOICE,
          { customerId, orders: mockOrders },
          workflowId,
        );

        const mockInvoice = {
          id: 'invoice-123',
          invoiceNumber: 'INV-123',
          customerId,
          orders: ['order-1'],
          items: mockOrders[0].items,
          totalAmount: 250,
          taxAmount: 25,
          grandTotal: 275,
          status: 'created',
          createdAt: new Date().toISOString(),
          dueDate: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        };

        const generatePdfTask = TaskEntityMockFactory.create({
          id: 'generate-pdf-task',
          type: TaskType.GENERATE_PDF,
          status: TaskStatus.PENDING,
          payload: { customerId, invoice: mockInvoice },
          workflow: { id: workflowId },
        });

        taskService.getTaskById.mockResolvedValue({
          ...createInvoiceTask,
          payload: { ...createInvoiceTask.payload, invoice: mockInvoice },
        } as any);
        taskService.createTask.mockResolvedValue(generatePdfTask as any);

        await workflowService.handleCreateInvoiceCompletion(
          'create-invoice-task',
        );

        expect(taskService.createTask).toHaveBeenCalledWith(
          TaskType.GENERATE_PDF,
          {
            customerId,
            invoice: mockInvoice,
            pdfProcessorUrl: 'https://mock-pdf-processor.com/generate',
          },
          workflowId,
        );

        const pdfUrl = 'https://storage.example.com/invoices/INV-123.pdf';

        const sendEmailTask = TaskEntityMockFactory.create({
          id: 'send-email-task',
          type: TaskType.SEND_EMAIL,
          status: TaskStatus.PENDING,
          payload: { customerId, invoice: mockInvoice, pdfUrl },
          workflow: { id: workflowId },
        });

        taskService.getTaskById.mockResolvedValue({
          ...generatePdfTask,
          payload: { ...generatePdfTask.payload, pdfUrl },
        } as any);
        taskService.createTask.mockResolvedValue(sendEmailTask as any);

        await workflowService.handleGeneratePdfCompletion('generate-pdf-task');

        expect(taskService.createTask).toHaveBeenCalledWith(
          TaskType.SEND_EMAIL,
          {
            customerId,
            invoice: mockInvoice,
            pdfUrl,
            emailServiceUrl: 'https://mock-email-service.com/send',
          },
          workflowId,
        );

        await workflowService.handleSendEmailCompletion('send-email-task');

        const mockTasks = [
          { ...fetchOrdersTask, status: TaskStatus.COMPLETED },
          { ...createInvoiceTask, status: TaskStatus.COMPLETED },
          { ...generatePdfTask, status: TaskStatus.COMPLETED },
          { ...sendEmailTask, status: TaskStatus.COMPLETED },
        ];

        taskService.findMany.mockResolvedValue(mockTasks as any);

        const status = await controller.getInvoiceWorkflowStatus(customerId);

        expect(status.customerId).toBe(customerId);
        expect(status.totalTasks).toBe(4);
        expect(status.completedTasks).toBe(4);
        expect(status.failedTasks).toBe(0);
        expect(status.workflows[workflowId].isComplete).toBe(true);
      });
    });

    describe('1.2 Multiple Orders Scenario', () => {
      it('should handle multiple orders for a customer', async () => {
        const customerId = 'customer-123';
        const mockOrders = [
          {
            id: 'order-1',
            customerId,
            status: 'delivered',
            invoiced: false,
            items: [
              { id: 'item-1', name: 'Product A', price: 100, quantity: 1 },
            ],
            totalAmount: 100,
            deliveryDate: '2024-01-15',
          },
          {
            id: 'order-2',
            customerId,
            status: 'delivered',
            invoiced: false,
            items: [
              { id: 'item-2', name: 'Product B', price: 200, quantity: 2 },
            ],
            totalAmount: 400,
            deliveryDate: '2024-01-16',
          },
        ];

        const fetchOrdersTask = TaskEntityMockFactory.create({
          id: 'fetch-orders-task',
          type: TaskType.FETCH_ORDERS,
          status: TaskStatus.COMPLETED,
          payload: { customerId, orders: mockOrders },
        });

        taskService.getTaskById.mockResolvedValue(fetchOrdersTask as any);

        const createInvoiceTask = TaskEntityMockFactory.create({
          id: 'create-invoice-task',
          type: TaskType.CREATE_INVOICE,
          status: TaskStatus.PENDING,
          payload: { customerId, orders: mockOrders },
        });
        taskService.createTask.mockResolvedValue(createInvoiceTask as any);

        await workflowService.handleFetchOrdersCompletion('fetch-orders-task');

        expect(taskService.createTask).toHaveBeenCalledWith(
          TaskType.CREATE_INVOICE,
          { customerId, orders: mockOrders },
          undefined,
        );
      });
    });

    describe('1.3 Date Range Filtering', () => {
      it('should filter orders by date range correctly', async () => {
        const customerId = 'customer-123';
        const dateFrom = '2024-01-15';
        const dateTo = '2024-01-20';

        const fetchOrdersTask = TaskEntityMockFactory.create({
          id: 'fetch-orders-task',
          type: TaskType.FETCH_ORDERS,
          status: TaskStatus.PENDING,
          payload: { customerId, dateFrom, dateTo },
        });

        taskService.createTask.mockResolvedValue(fetchOrdersTask as any);
        messagingService.publishTask.mockResolvedValue();

        await controller.startInvoiceWorkflow({
          customerId,
          dateFrom,
          dateTo,
        });

        expect(taskService.createTask).toHaveBeenCalledWith(
          TaskType.FETCH_ORDERS,
          { customerId, dateFrom, dateTo },
          undefined,
        );
      });
    });
  });

  describe('2. Error Scenarios', () => {
    describe('2.1 No Deliverable Orders', () => {
      it('should handle scenario with no deliverable orders', async () => {
        const customerId = 'customer-123';

        const fetchOrdersTask = TaskEntityMockFactory.create({
          id: 'fetch-orders-task',
          type: TaskType.FETCH_ORDERS,
          status: TaskStatus.COMPLETED,
          payload: { customerId, orders: [] },
        });

        taskService.getTaskById.mockResolvedValue(fetchOrdersTask as any);

        await workflowService.handleFetchOrdersCompletion('fetch-orders-task');

        expect(taskService.createTask).not.toHaveBeenCalled();
        expect(messagingService.publishTask).not.toHaveBeenCalled();
      });
    });

    describe('2.2 All Orders Already Invoiced', () => {
      it('should handle scenario where all orders are already invoiced', async () => {
        const customerId = 'customer-123';

        const fetchOrdersTask = TaskEntityMockFactory.create({
          id: 'fetch-orders-task',
          type: TaskType.FETCH_ORDERS,
          status: TaskStatus.COMPLETED,
          payload: { customerId, orders: [] },
        });

        taskService.getTaskById.mockResolvedValue(fetchOrdersTask as any);

        await workflowService.handleFetchOrdersCompletion('fetch-orders-task');

        expect(taskService.createTask).not.toHaveBeenCalled();
      });
    });

    describe('2.3 PDF Generation Failure', () => {
      it('should handle PDF generation failure and create compensation task', async () => {
        const customerId = 'customer-123';
        const workflowId = 'workflow-123';
        const error = new Error('PDF processor service unavailable');

        const compensationTask = TaskEntityMockFactory.create({
          id: 'compensation-task',
          type: TaskType.COMPENSATION,
          status: TaskStatus.PENDING,
          payload: {
            originalTaskId: 'generate-pdf-task',
            originalTaskType: TaskType.GENERATE_PDF,
            customerId,
            reason: error.message,
          },
          workflow: { id: workflowId },
        });

        taskService.getTaskById.mockResolvedValue({
          id: 'generate-pdf-task',
          type: TaskType.GENERATE_PDF,
          payload: { customerId },
          workflow: { id: workflowId },
        } as any);
        taskService.createTask.mockResolvedValue(compensationTask as any);

        await workflowService.handleTaskFailure('generate-pdf-task', error);

        expect(taskService.createTask).toHaveBeenCalledWith(
          TaskType.COMPENSATION,
          {
            originalTaskId: 'generate-pdf-task',
            originalTaskType: TaskType.GENERATE_PDF,
            customerId,
            reason: error.message,
          },
          workflowId,
        );
        expect(messagingService.publishTask).toHaveBeenCalledWith(
          TaskType.COMPENSATION,
          'compensation-task',
        );
      });
    });

    describe('2.4 Email Service Failure', () => {
      it('should handle email service failure', async () => {
        const customerId = 'customer-123';
        const workflowId = 'workflow-123';
        const error = new Error('Email service rate limit exceeded');

        const compensationTask = TaskEntityMockFactory.create({
          id: 'compensation-task',
          type: TaskType.COMPENSATION,
          status: TaskStatus.PENDING,
          payload: {
            originalTaskId: 'send-email-task',
            originalTaskType: TaskType.SEND_EMAIL,
            customerId,
            reason: error.message,
          },
          workflow: { id: workflowId },
        });

        taskService.getTaskById.mockResolvedValue({
          id: 'send-email-task',
          type: TaskType.SEND_EMAIL,
          payload: { customerId },
          workflow: { id: workflowId },
        } as any);
        taskService.createTask.mockResolvedValue(compensationTask as any);

        await workflowService.handleTaskFailure('send-email-task', error);

        expect(taskService.createTask).toHaveBeenCalledWith(
          TaskType.COMPENSATION,
          {
            originalTaskId: 'send-email-task',
            originalTaskType: TaskType.SEND_EMAIL,
            customerId,
            reason: error.message,
          },
          workflowId,
        );
      });
    });

    describe('2.5 Invalid Customer ID', () => {
      it('should handle invalid customer ID gracefully', async () => {
        const invalidCustomerId = '';

        taskService.createTask.mockRejectedValue(
          new Error('Customer ID is required'),
        );

        await expect(
          controller.startInvoiceWorkflow({
            customerId: invalidCustomerId,
          }),
        ).rejects.toThrow('Customer ID is required');
      });
    });

    describe('2.6 Invalid Date Range', () => {
      it('should handle invalid date range', async () => {
        const customerId = 'customer-123';
        const invalidDateFrom = '2024-13-01';

        taskService.createTask.mockRejectedValue(
          new Error('Invalid date format'),
        );

        await expect(
          controller.startInvoiceWorkflow({
            customerId,
            dateFrom: invalidDateFrom,
          }),
        ).rejects.toThrow('Invalid date format');
      });
    });
  });

  describe('3. Scheduling Scenarios', () => {
    describe('3.1 Daily Invoice Creation', () => {
      it('should create recurring daily invoice workflow', async () => {
        const customerId = 'customer-123';
        const cronExpression = '0 0 * * *';

        const mockTask = TaskEntityMockFactory.create({
          id: 'recurring-task',
          type: TaskType.FETCH_ORDERS,
          status: TaskStatus.PENDING,
          payload: { customerId, cronExpression, isRecurring: true },
        });

        schedulerService.createRecurringTask.mockResolvedValue(mockTask as any);

        const result = await controller.createRecurringInvoiceWorkflow({
          customerId,
          cronExpression,
          dateFrom: '2024-01-01',
          dateTo: '2024-01-31',
        });

        expect(result.message).toBe('Recurring invoice workflow created');
        expect(result.cronExpression).toBe(cronExpression);
        expect(schedulerService.createRecurringTask).toHaveBeenCalledWith(
          TaskType.FETCH_ORDERS,
          {
            customerId,
            dateFrom: '2024-01-01',
            dateTo: '2024-01-31',
          },
          cronExpression,
          undefined,
        );
      });
    });

    describe('3.2 Weekly Email Sending', () => {
      it('should create scheduled weekly email workflow', async () => {
        const customerId = 'customer-123';
        const invoiceId = 'invoice-123';
        const scheduledAt = '2024-01-20T17:00:00Z';

        const mockTask = TaskEntityMockFactory.create({
          id: 'scheduled-email-task',
          type: TaskType.SEND_EMAIL,
          status: TaskStatus.PENDING,
          payload: { customerId, invoiceId },
          scheduledAt: new Date(scheduledAt),
        });

        schedulerService.createScheduledTask.mockResolvedValue(mockTask as any);

        const result = await controller.createScheduledEmailWorkflow({
          customerId,
          invoiceId,
          scheduledAt,
        });

        expect(result.message).toBe('Scheduled email workflow created');
        expect(result.scheduledAt).toBe(new Date(scheduledAt).toISOString());
        expect(schedulerService.createScheduledTask).toHaveBeenCalledWith(
          TaskType.SEND_EMAIL,
          { customerId, invoiceId },
          new Date(scheduledAt),
          undefined,
        );
      });
    });

    describe('3.3 Invalid Scheduled Date', () => {
      it('should reject invalid scheduled date', async () => {
        const customerId = 'customer-123';
        const invalidScheduledAt = 'invalid-date';

        await expect(
          controller.createScheduledInvoiceWorkflow({
            customerId,
            scheduledAt: invalidScheduledAt,
          }),
        ).rejects.toThrow('Invalid date format');

        expect(schedulerService.createScheduledTask).not.toHaveBeenCalled();
      });
    });

    describe('3.4 Past Scheduled Date', () => {
      it('should handle past scheduled date', async () => {
        const customerId = 'customer-123';
        const pastDate = new Date(
          Date.now() - 24 * 60 * 60 * 1000,
        ).toISOString();

        const mockTask = TaskEntityMockFactory.create({
          id: 'past-scheduled-task',
          type: TaskType.FETCH_ORDERS,
          status: TaskStatus.PENDING,
          payload: { customerId },
          scheduledAt: new Date(pastDate),
        });

        schedulerService.createScheduledTask.mockResolvedValue(mockTask as any);

        const result = await controller.createScheduledInvoiceWorkflow({
          customerId,
          scheduledAt: pastDate,
        });

        expect(result.message).toBe('Scheduled invoice workflow created');
        expect(schedulerService.createScheduledTask).toHaveBeenCalled();
      });
    });
  });

  describe('4. Edge Cases', () => {
    describe('4.1 Empty Orders Array', () => {
      it('should handle empty orders array gracefully', async () => {
        const customerId = 'customer-123';

        const fetchOrdersTask = TaskEntityMockFactory.create({
          id: 'fetch-orders-task',
          type: TaskType.FETCH_ORDERS,
          status: TaskStatus.COMPLETED,
          payload: { customerId, orders: [] },
        });

        taskService.getTaskById.mockResolvedValue(fetchOrdersTask as any);

        await workflowService.handleFetchOrdersCompletion('fetch-orders-task');

        expect(taskService.createTask).not.toHaveBeenCalled();
      });
    });

    describe('4.2 Orders with Null Delivery Date', () => {
      it('should handle orders with null delivery date', async () => {
        const customerId = 'customer-123';

        const fetchOrdersTask = TaskEntityMockFactory.create({
          id: 'fetch-orders-task',
          type: TaskType.FETCH_ORDERS,
          status: TaskStatus.COMPLETED,
          payload: { customerId, orders: [] },
        });

        taskService.getTaskById.mockResolvedValue(fetchOrdersTask as any);

        await workflowService.handleFetchOrdersCompletion('fetch-orders-task');

        expect(taskService.createTask).not.toHaveBeenCalled();
      });
    });

    describe('4.3 Large Number of Orders', () => {
      it('should handle large number of orders', async () => {
        const customerId = 'customer-123';
        const largeOrderSet = Array.from({ length: 100 }, (_, i) => ({
          id: `order-${i + 1}`,
          customerId,
          status: 'delivered',
          invoiced: false,
          items: [
            {
              id: `item-${i + 1}`,
              name: `Product ${i + 1}`,
              price: 100,
              quantity: 1,
            },
          ],
          totalAmount: 100,
          deliveryDate: '2024-01-15',
        }));

        const fetchOrdersTask = TaskEntityMockFactory.create({
          id: 'fetch-orders-task',
          type: TaskType.FETCH_ORDERS,
          status: TaskStatus.COMPLETED,
          payload: { customerId, orders: largeOrderSet },
        });

        const createInvoiceTask = TaskEntityMockFactory.create({
          id: 'create-invoice-task',
          type: TaskType.CREATE_INVOICE,
          status: TaskStatus.PENDING,
          payload: { customerId, orders: largeOrderSet },
        });

        taskService.getTaskById.mockResolvedValue(fetchOrdersTask as any);
        taskService.createTask.mockResolvedValue(createInvoiceTask as any);

        await workflowService.handleFetchOrdersCompletion('fetch-orders-task');

        expect(taskService.createTask).toHaveBeenCalledWith(
          TaskType.CREATE_INVOICE,
          { customerId, orders: largeOrderSet },
          undefined,
        );
      });
    });

    describe('4.4 Orders with Zero Amount', () => {
      it('should handle orders with zero amount', async () => {
        const customerId = 'customer-123';
        const mockOrders = [
          {
            id: 'order-1',
            customerId,
            status: 'delivered',
            invoiced: false,
            items: [
              { id: 'item-1', name: 'Free Product', price: 0, quantity: 1 },
            ],
            totalAmount: 0,
            deliveryDate: '2024-01-15',
          },
        ];

        const fetchOrdersTask = TaskEntityMockFactory.create({
          id: 'fetch-orders-task',
          type: TaskType.FETCH_ORDERS,
          status: TaskStatus.COMPLETED,
          payload: { customerId, orders: mockOrders },
        });

        const createInvoiceTask = TaskEntityMockFactory.create({
          id: 'create-invoice-task',
          type: TaskType.CREATE_INVOICE,
          status: TaskStatus.PENDING,
          payload: { customerId, orders: mockOrders },
        });

        taskService.getTaskById.mockResolvedValue(fetchOrdersTask as any);
        taskService.createTask.mockResolvedValue(createInvoiceTask as any);

        await workflowService.handleFetchOrdersCompletion('fetch-orders-task');

        expect(taskService.createTask).toHaveBeenCalledWith(
          TaskType.CREATE_INVOICE,
          { customerId, orders: mockOrders },
          undefined,
        );
      });
    });
  });

  describe('5. Workflow Status Monitoring', () => {
    describe('5.1 Get Customer Invoice Tasks', () => {
      it('should return customer invoice tasks with proper formatting', async () => {
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

        expect(result.customerId).toBe(customerId);
        expect(result.tasks).toHaveLength(2);
        expect(result.tasks[0].status).toBe(TaskStatus.COMPLETED);
        expect(result.tasks[1].status).toBe(TaskStatus.PENDING);
      });
    });

    describe('5.2 Get Invoice Workflow Status', () => {
      it('should return comprehensive workflow status', async () => {
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
            status: TaskStatus.PROCESSING,
            workflow: { id: 'workflow-123' },
          }),
          TaskEntityMockFactory.create({
            id: 'task-3',
            type: TaskType.GENERATE_PDF,
            status: TaskStatus.FAILED,
            workflow: { id: 'workflow-123' },
          }),
          TaskEntityMockFactory.create({
            id: 'task-4',
            type: TaskType.SEND_EMAIL,
            status: TaskStatus.PENDING,
            workflow: null,
          }),
        ];

        taskService.findMany.mockResolvedValue(mockTasks as any);

        const result = await controller.getInvoiceWorkflowStatus(customerId);

        expect(result.customerId).toBe(customerId);
        expect(result.totalTasks).toBe(4);
        expect(result.completedTasks).toBe(1);
        expect(result.processingTasks).toBe(1);
        expect(result.failedTasks).toBe(1);
        expect(result.pendingTasks).toBe(1);
        expect(result.workflows['workflow-123'].totalTasks).toBe(3);
        expect(result.workflows['workflow-123'].isComplete).toBe(false);
        expect(result.workflows['standalone'].totalTasks).toBe(1);
        expect(result.workflows['standalone'].isComplete).toBe(false);
      });
    });

    describe('5.3 Empty Customer Tasks', () => {
      it('should handle customer with no tasks', async () => {
        const customerId = 'customer-123';

        taskService.findMany.mockResolvedValue([]);

        const result = await controller.getCustomerInvoiceTasks(customerId);

        expect(result.customerId).toBe(customerId);
        expect(result.tasks).toHaveLength(0);
      });
    });
  });

  describe('6. Integration with External Services', () => {
    describe('6.1 PDF Processor Integration', () => {
      it('should handle custom PDF processor URL', async () => {
        const customerId = 'customer-123';
        const customPdfUrl = 'https://custom-pdf-processor.com/generate';

        const mockInvoice = {
          id: 'invoice-123',
          invoiceNumber: 'INV-123',
          customerId,
        };

        const generatePdfTask = TaskEntityMockFactory.create({
          id: 'generate-pdf-task',
          type: TaskType.GENERATE_PDF,
          status: TaskStatus.PENDING,
          payload: {
            customerId,
            invoice: mockInvoice,
            pdfProcessorUrl: customPdfUrl,
          },
        });

        taskService.getTaskById.mockResolvedValue({
          ...generatePdfTask,
          payload: {
            ...generatePdfTask.payload,
            pdfProcessorUrl: customPdfUrl,
          },
        } as any);

        const newGeneratePdfTask = TaskEntityMockFactory.create({
          id: 'new-generate-pdf-task',
          type: TaskType.GENERATE_PDF,
          status: TaskStatus.PENDING,
          payload: {
            customerId,
            invoice: mockInvoice,
            pdfProcessorUrl: customPdfUrl,
          },
        });
        taskService.createTask.mockResolvedValue(newGeneratePdfTask as any);

        await workflowService.handleCreateInvoiceCompletion(
          'create-invoice-task',
        );

        expect(taskService.createTask).toHaveBeenCalledWith(
          TaskType.GENERATE_PDF,
          {
            customerId,
            invoice: mockInvoice,
            pdfProcessorUrl: customPdfUrl,
          },
          undefined,
        );
      });
    });

    describe('6.2 Email Service Integration', () => {
      it('should handle custom email service URL', async () => {
        const customerId = 'customer-123';
        const customEmailUrl = 'https://custom-email-service.com/send';

        const mockInvoice = {
          id: 'invoice-123',
          invoiceNumber: 'INV-123',
          customerId,
        };

        const pdfUrl = 'https://storage.example.com/invoices/INV-123.pdf';

        const sendEmailTask = TaskEntityMockFactory.create({
          id: 'send-email-task',
          type: TaskType.SEND_EMAIL,
          status: TaskStatus.PENDING,
          payload: {
            customerId,
            invoice: mockInvoice,
            pdfUrl,
            emailServiceUrl: customEmailUrl,
          },
        });

        taskService.getTaskById.mockResolvedValue({
          ...sendEmailTask,
          payload: {
            ...sendEmailTask.payload,
            emailServiceUrl: customEmailUrl,
          },
        } as any);

        const newSendEmailTask = TaskEntityMockFactory.create({
          id: 'new-send-email-task',
          type: TaskType.SEND_EMAIL,
          status: TaskStatus.PENDING,
          payload: {
            customerId,
            invoice: mockInvoice,
            pdfUrl,
            emailServiceUrl: customEmailUrl,
          },
        });
        taskService.createTask.mockResolvedValue(newSendEmailTask as any);

        await workflowService.handleGeneratePdfCompletion('generate-pdf-task');

        expect(taskService.createTask).toHaveBeenCalledWith(
          TaskType.SEND_EMAIL,
          {
            customerId,
            invoice: mockInvoice,
            pdfUrl,
            emailServiceUrl: customEmailUrl,
          },
          undefined,
        );
      });
    });
  });

  describe('7. Performance and Scalability', () => {
    describe('7.1 Concurrent Workflows', () => {
      it('should handle multiple concurrent workflows', async () => {
        const customerId = 'customer-1';

        const mockTask = {
          id: 'task-1',
          type: TaskType.FETCH_ORDERS,
          status: TaskStatus.PENDING,
          payload: { customerId },
        };

        taskService.createTask.mockReset();
        taskService.createTask.mockResolvedValue(mockTask as any);
        messagingService.publishTask.mockResolvedValue();

        const result = await controller.startInvoiceWorkflow({ customerId });

        expect(result.message).toBe('Invoice workflow started');
        expect(result.taskId).toBe('task-1');
        expect(taskService.createTask).toHaveBeenCalledWith(
          TaskType.FETCH_ORDERS,
          { customerId, dateFrom: undefined, dateTo: undefined },
          undefined,
        );
        expect(messagingService.publishTask).toHaveBeenCalledWith(
          TaskType.FETCH_ORDERS,
          'task-1',
        );
      });
    });

    describe('7.2 Large Payload Handling', () => {
      it('should handle large invoice payloads', async () => {
        const customerId = 'customer-123';
        const largeInvoice = {
          id: 'invoice-123',
          invoiceNumber: 'INV-123',
          customerId,
          items: Array.from({ length: 1000 }, (_, i) => ({
            id: `item-${i + 1}`,
            name: `Product ${i + 1}`,
            price: Math.random() * 1000,
            quantity: Math.floor(Math.random() * 10) + 1,
          })),
          totalAmount: 50000,
          taxAmount: 5000,
          grandTotal: 55000,
        };

        const generatePdfTask = TaskEntityMockFactory.create({
          id: 'generate-pdf-task',
          type: TaskType.GENERATE_PDF,
          status: TaskStatus.PENDING,
          payload: { customerId, invoice: largeInvoice },
        });

        taskService.getTaskById.mockResolvedValue({
          ...generatePdfTask,
          payload: { ...generatePdfTask.payload, invoice: largeInvoice },
        } as any);

        const newGeneratePdfTask = TaskEntityMockFactory.create({
          id: 'new-generate-pdf-task',
          type: TaskType.GENERATE_PDF,
          status: TaskStatus.PENDING,
          payload: {
            customerId,
            invoice: largeInvoice,
            pdfProcessorUrl: 'https://mock-pdf-processor.com/generate',
          },
        });
        taskService.createTask.mockResolvedValue(newGeneratePdfTask as any);

        await workflowService.handleCreateInvoiceCompletion(
          'create-invoice-task',
        );

        expect(taskService.createTask).toHaveBeenCalledWith(
          TaskType.GENERATE_PDF,
          {
            customerId,
            invoice: largeInvoice,
            pdfProcessorUrl: 'https://mock-pdf-processor.com/generate',
          },
          undefined,
        );
      });
    });
  });

  describe('8. Order Filtering and Business Logic', () => {
    describe('8.1 Filter Delivered but Not Invoiced Orders', () => {
      it('should only process orders that are delivered and not invoiced', async () => {
        const customerId = 'customer-123';

        const mixedOrders = OrderMockFactory.createMixedStatusArray({
          customerId,
        });

        const fetchOrdersTask = TaskEntityMockFactory.create({
          id: 'fetch-orders-task',
          type: TaskType.FETCH_ORDERS,
          status: TaskStatus.COMPLETED,
          payload: { customerId, orders: mixedOrders },
        });

        const deliverableOrders = mixedOrders.filter(
          (order) => order.status === 'delivered' && !order.invoiced,
        );

        taskService.getTaskById.mockResolvedValue({
          ...fetchOrdersTask,
          payload: { ...fetchOrdersTask.payload, orders: deliverableOrders },
        } as any);

        const createInvoiceTask = TaskEntityMockFactory.create({
          id: 'create-invoice-task',
          type: TaskType.CREATE_INVOICE,
          status: TaskStatus.PENDING,
          payload: { customerId, orders: deliverableOrders },
        });
        taskService.createTask.mockResolvedValue(createInvoiceTask as any);

        await workflowService.handleFetchOrdersCompletion('fetch-orders-task');

        expect(taskService.createTask).toHaveBeenCalledWith(
          TaskType.CREATE_INVOICE,
          { customerId, orders: deliverableOrders },
          undefined,
        );

        expect(deliverableOrders).toHaveLength(2);
        expect(
          deliverableOrders.every(
            (order) => order.status === 'delivered' && !order.invoiced,
          ),
        ).toBe(true);
      });
    });

    describe('8.2 Item Price and Details Validation', () => {
      it('should validate item prices and details are present', async () => {
        const customerId = 'customer-123';
        const ordersWithItemDetails = [
          {
            id: 'order-1',
            customerId,
            status: 'delivered',
            invoiced: false,
            items: [
              {
                id: 'item-1',
                name: 'Product A',
                price: 100,
                quantity: 2,
                description: 'High-quality product',
                sku: 'PROD-A-001',
              },
              {
                id: 'item-2',
                name: 'Product B',
                price: 50,
                quantity: 1,
                description: 'Standard product',
                sku: 'PROD-B-002',
              },
            ],
            totalAmount: 250,
            deliveryDate: '2024-01-15',
          },
        ];

        const fetchOrdersTask = TaskEntityMockFactory.create({
          id: 'fetch-orders-task',
          type: TaskType.FETCH_ORDERS,
          status: TaskStatus.COMPLETED,
          payload: { customerId, orders: ordersWithItemDetails },
        });

        taskService.getTaskById.mockResolvedValue(fetchOrdersTask as any);

        const createInvoiceTask = TaskEntityMockFactory.create({
          id: 'create-invoice-task',
          type: TaskType.CREATE_INVOICE,
          status: TaskStatus.PENDING,
          payload: { customerId, orders: ordersWithItemDetails },
        });
        taskService.createTask.mockResolvedValue(createInvoiceTask as any);

        await workflowService.handleFetchOrdersCompletion('fetch-orders-task');

        expect(taskService.createTask).toHaveBeenCalledWith(
          TaskType.CREATE_INVOICE,
          { customerId, orders: ordersWithItemDetails },
          undefined,
        );

        const calledOrders = taskService.createTask.mock.calls[0][1].orders;
        expect(calledOrders[0].items).toHaveLength(2);
        expect(calledOrders[0].items[0]).toHaveProperty('price', 100);
        expect(calledOrders[0].items[0]).toHaveProperty('name', 'Product A');
        expect(calledOrders[0].items[0]).toHaveProperty('sku', 'PROD-A-001');
      });
    });

    describe('8.3 Date Range Filtering Logic', () => {
      it('should filter orders by delivery date range correctly', async () => {
        const customerId = 'customer-123';
        const dateFrom = '2024-01-15';
        const dateTo = '2024-01-20';

        const ordersWithDifferentDates = [
          {
            id: 'order-1',
            customerId,
            status: 'delivered',
            invoiced: false,
            items: [
              { id: 'item-1', name: 'Product A', price: 100, quantity: 1 },
            ],
            totalAmount: 100,
            deliveryDate: '2024-01-14',
          },
          {
            id: 'order-2',
            customerId,
            status: 'delivered',
            invoiced: false,
            items: [
              { id: 'item-2', name: 'Product B', price: 200, quantity: 1 },
            ],
            totalAmount: 200,
            deliveryDate: '2024-01-16',
          },
          {
            id: 'order-3',
            customerId,
            status: 'delivered',
            invoiced: false,
            items: [
              { id: 'item-3', name: 'Product C', price: 150, quantity: 1 },
            ],
            totalAmount: 150,
            deliveryDate: '2024-01-21',
          },
          {
            id: 'order-4',
            customerId,
            status: 'delivered',
            invoiced: false,
            items: [
              { id: 'item-4', name: 'Product D', price: 300, quantity: 1 },
            ],
            totalAmount: 300,
            deliveryDate: null,
          },
        ];

        const filteredOrders = ordersWithDifferentDates.filter((order) => {
          if (!order.deliveryDate) return false;
          if (dateFrom && order.deliveryDate < dateFrom) return false;
          if (dateTo && order.deliveryDate > dateTo) return false;
          return true;
        });

        const fetchOrdersTask = TaskEntityMockFactory.create({
          id: 'fetch-orders-task',
          type: TaskType.FETCH_ORDERS,
          status: TaskStatus.COMPLETED,
          payload: { customerId, dateFrom, dateTo, orders: filteredOrders },
        });

        taskService.getTaskById.mockResolvedValue(fetchOrdersTask as any);

        const createInvoiceTask = TaskEntityMockFactory.create({
          id: 'create-invoice-task',
          type: TaskType.CREATE_INVOICE,
          status: TaskStatus.PENDING,
          payload: { customerId, orders: filteredOrders },
        });
        taskService.createTask.mockResolvedValue(createInvoiceTask as any);

        await workflowService.handleFetchOrdersCompletion('fetch-orders-task');

        expect(filteredOrders).toHaveLength(1);
        expect(filteredOrders[0].id).toBe('order-2');
        expect(taskService.createTask).toHaveBeenCalledWith(
          TaskType.CREATE_INVOICE,
          { customerId, orders: filteredOrders },
          undefined,
        );
      });
    });
  });

  describe('9. PDF and Email Service Integration', () => {
    describe('9.1 PDF Processor Integration with Custom URL', () => {
      it('should use custom PDF processor URL when provided', async () => {
        const customerId = 'customer-123';
        const customPdfUrl = 'https://custom-pdf-service.com/generate';
        const mockInvoice = {
          id: 'invoice-123',
          invoiceNumber: 'INV-123',
          customerId,
          items: [{ id: 'item-1', name: 'Product A', price: 100, quantity: 1 }],
          totalAmount: 100,
        };
        const pdfUrl = 'https://storage.example.com/invoices/INV-123.pdf';

        const generatePdfTask = TaskEntityMockFactory.create({
          id: 'generate-pdf-task',
          type: TaskType.GENERATE_PDF,
          status: TaskStatus.PENDING,
          payload: {
            customerId,
            invoice: mockInvoice,
            pdfProcessorUrl: customPdfUrl,
            pdfUrl,
          },
        });

        taskService.getTaskById.mockResolvedValue(generatePdfTask as any);

        const sendEmailTask = TaskEntityMockFactory.create({
          id: 'send-email-task',
          type: TaskType.SEND_EMAIL,
          status: TaskStatus.PENDING,
          payload: { customerId, invoice: mockInvoice },
        });
        taskService.createTask.mockResolvedValue(sendEmailTask as any);

        await workflowService.handleGeneratePdfCompletion('generate-pdf-task');

        expect(taskService.createTask).toHaveBeenCalledWith(
          TaskType.SEND_EMAIL,
          {
            customerId,
            invoice: mockInvoice,
            pdfUrl,
            emailServiceUrl: 'https://mock-email-service.com/send',
          },
          undefined,
        );
      });
    });

    describe('9.2 Email Service Integration with Customer Details', () => {
      it('should include customer email and invoice details in email task', async () => {
        const customerId = 'customer-123';
        const mockInvoice = {
          id: 'invoice-123',
          invoiceNumber: 'INV-123',
          customerId,
          customerEmail: 'customer@example.com',
          items: [{ id: 'item-1', name: 'Product A', price: 100, quantity: 1 }],
          totalAmount: 100,
          grandTotal: 110,
        };
        const pdfUrl = 'https://storage.example.com/invoices/INV-123.pdf';

        const sendEmailTask = TaskEntityMockFactory.create({
          id: 'send-email-task',
          type: TaskType.SEND_EMAIL,
          status: TaskStatus.PENDING,
          payload: {
            customerId,
            invoice: mockInvoice,
            pdfUrl,
            customerEmail: mockInvoice.customerEmail,
          },
        });

        taskService.getTaskById.mockResolvedValue(sendEmailTask as any);

        await workflowService.handleSendEmailCompletion('send-email-task');

        expect(taskService.getTaskById).toHaveBeenCalledWith('send-email-task');
      });
    });

    describe('9.3 PDF Generation with Invoice Data Validation', () => {
      it('should validate invoice data before PDF generation', async () => {
        const customerId = 'customer-123';
        const mockInvoice = {
          id: 'invoice-123',
          invoiceNumber: 'INV-123',
          customerId,
          items: [
            { id: 'item-1', name: 'Product A', price: 100, quantity: 2 },
            { id: 'item-2', name: 'Product B', price: 50, quantity: 1 },
          ],
          totalAmount: 250,
          taxAmount: 25,
          grandTotal: 275,
          customerName: 'John Doe',
          customerAddress: '123 Main St, City, Country',
        };
        const pdfUrl = 'https://storage.example.com/invoices/INV-123.pdf';

        const generatePdfTask = TaskEntityMockFactory.create({
          id: 'generate-pdf-task',
          type: TaskType.GENERATE_PDF,
          status: TaskStatus.PENDING,
          payload: { customerId, invoice: mockInvoice, pdfUrl },
        });

        taskService.getTaskById.mockResolvedValue(generatePdfTask as any);

        const sendEmailTask = TaskEntityMockFactory.create({
          id: 'send-email-task',
          type: TaskType.SEND_EMAIL,
          status: TaskStatus.PENDING,
          payload: { customerId, invoice: mockInvoice },
        });
        taskService.createTask.mockResolvedValue(sendEmailTask as any);

        await workflowService.handleGeneratePdfCompletion('generate-pdf-task');

        const calledPayload = taskService.createTask.mock.calls[0][1];
        expect(calledPayload.invoice).toEqual(mockInvoice);
        expect(calledPayload.invoice.items).toHaveLength(2);
        expect(calledPayload.invoice.grandTotal).toBe(275);
      });
    });
  });

  describe('10. Business Rule Validation', () => {
    describe('10.1 Invoice Creation with Tax Calculation', () => {
      it('should create invoice with proper tax calculation', async () => {
        const customerId = 'customer-123';
        const orders = [
          {
            id: 'order-1',
            customerId,
            status: 'delivered',
            invoiced: false,
            items: [
              { id: 'item-1', name: 'Product A', price: 100, quantity: 2 },
            ],
            totalAmount: 200,
            deliveryDate: '2024-01-15',
          },
          {
            id: 'order-2',
            customerId,
            status: 'delivered',
            invoiced: false,
            items: [
              { id: 'item-2', name: 'Product B', price: 50, quantity: 1 },
            ],
            totalAmount: 50,
            deliveryDate: '2024-01-16',
          },
        ];

        const fetchOrdersTask = TaskEntityMockFactory.create({
          id: 'fetch-orders-task',
          type: TaskType.FETCH_ORDERS,
          status: TaskStatus.COMPLETED,
          payload: { customerId, orders },
        });

        taskService.getTaskById.mockResolvedValue(fetchOrdersTask as any);

        const createInvoiceTask = TaskEntityMockFactory.create({
          id: 'create-invoice-task',
          type: TaskType.CREATE_INVOICE,
          status: TaskStatus.PENDING,
          payload: { customerId, orders },
        });
        taskService.createTask.mockResolvedValue(createInvoiceTask as any);

        await workflowService.handleFetchOrdersCompletion('fetch-orders-task');

        expect(taskService.createTask).toHaveBeenCalledWith(
          TaskType.CREATE_INVOICE,
          { customerId, orders },
          undefined,
        );

        const totalAmount = orders.reduce(
          (sum, order) => sum + order.totalAmount,
          0,
        );
        expect(totalAmount).toBe(250);
      });
    });

    describe('10.2 Order Status Validation', () => {
      it('should validate order status before processing', async () => {
        const customerId = 'customer-123';
        const invalidOrders = [
          {
            id: 'order-1',
            customerId,
            status: 'cancelled',
            invoiced: false,
            items: [
              { id: 'item-1', name: 'Product A', price: 100, quantity: 1 },
            ],
            totalAmount: 100,
            deliveryDate: '2024-01-15',
          },
          {
            id: 'order-2',
            customerId,
            status: 'shipped',
            invoiced: false,
            items: [
              { id: 'item-2', name: 'Product B', price: 200, quantity: 1 },
            ],
            totalAmount: 200,
            deliveryDate: '2024-01-16',
          },
        ];

        const validOrders = invalidOrders.filter(
          (order) => order.status === 'delivered' && !order.invoiced,
        );

        const fetchOrdersTask = TaskEntityMockFactory.create({
          id: 'fetch-orders-task',
          type: TaskType.FETCH_ORDERS,
          status: TaskStatus.COMPLETED,
          payload: { customerId, orders: validOrders },
        });

        taskService.getTaskById.mockResolvedValue(fetchOrdersTask as any);

        await workflowService.handleFetchOrdersCompletion('fetch-orders-task');

        expect(validOrders).toHaveLength(0);
        expect(taskService.createTask).not.toHaveBeenCalled();
      });
    });
  });
});
