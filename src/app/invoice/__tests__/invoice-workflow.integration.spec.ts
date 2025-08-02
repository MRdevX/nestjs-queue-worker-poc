import { Test, TestingModule } from '@nestjs/testing';
import { TaskEntityMockFactory } from '@test/mocks';
import { InvoiceController } from '../invoice.controller';
import { InvoiceWorkflowService } from '../invoice-workflow.service';
import { TaskService } from '../../task/task.service';
import { MessagingService } from '../../core/messaging/messaging.service';
import { SchedulerService } from '../../scheduler/scheduler.service';
import { TaskType } from '../../task/types/task-type.enum';
import { TaskStatus } from '../../task/types/task-status.enum';

describe('Invoice Workflow Integration', () => {
  let controller: InvoiceController;
  let workflowService: InvoiceWorkflowService;
  let taskService: jest.Mocked<TaskService>;
  let messagingService: jest.Mocked<MessagingService>;
  let schedulerService: jest.Mocked<SchedulerService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvoiceController],
      providers: [
        InvoiceWorkflowService,
        {
          provide: TaskService,
          useValue: {
            createTask: jest.fn(),
            getTaskById: jest.fn(),
            findMany: jest.fn(),
            updateTaskStatus: jest.fn(),
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

  describe('Complete Invoice Workflow', () => {
    it('should execute complete invoice workflow from start to finish', async () => {
      const customerId = 'customer-123';
      const workflowId = 'workflow-123';

      // Step 1: Start invoice workflow
      const fetchOrdersTask = TaskEntityMockFactory.create({
        id: 'fetch-orders-task',
        type: TaskType.FETCH_ORDERS,
        status: TaskStatus.PENDING,
        payload: {
          customerId,
          dateFrom: '2024-01-01',
          dateTo: '2024-01-31',
        },
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

      // Step 2: Handle fetch orders completion
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
        payload: {
          customerId,
          orders: mockOrders,
        },
        workflow: { id: workflowId },
      });

      // Mock the task service to return the fetch orders task with orders
      taskService.getTaskById.mockResolvedValue({
        ...fetchOrdersTask,
        payload: {
          ...fetchOrdersTask.payload,
          orders: mockOrders,
        },
      } as any);
      taskService.createTask.mockResolvedValue(createInvoiceTask as any);

      await workflowService.handleFetchOrdersCompletion('fetch-orders-task');

      expect(taskService.createTask).toHaveBeenCalledWith(
        TaskType.CREATE_INVOICE,
        {
          customerId,
          orders: mockOrders,
        },
        workflowId,
      );
      expect(messagingService.publishTask).toHaveBeenCalledWith(
        TaskType.CREATE_INVOICE,
        'create-invoice-task',
      );

      // Step 3: Handle create invoice completion
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
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const generatePdfTask = TaskEntityMockFactory.create({
        id: 'generate-pdf-task',
        type: TaskType.GENERATE_PDF,
        status: TaskStatus.PENDING,
        payload: {
          customerId,
          invoice: mockInvoice,
          pdfProcessorUrl: 'https://mock-pdf-processor.com/generate',
        },
        workflow: { id: workflowId },
      });

      // Mock the task service to return the create invoice task with invoice
      taskService.getTaskById.mockResolvedValue({
        ...createInvoiceTask,
        payload: {
          ...createInvoiceTask.payload,
          invoice: mockInvoice,
        },
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
      expect(messagingService.publishTask).toHaveBeenCalledWith(
        TaskType.GENERATE_PDF,
        'generate-pdf-task',
      );

      // Step 4: Handle generate PDF completion
      const pdfUrl = 'https://storage.example.com/invoices/INV-123.pdf';

      const sendEmailTask = TaskEntityMockFactory.create({
        id: 'send-email-task',
        type: TaskType.SEND_EMAIL,
        status: TaskStatus.PENDING,
        payload: {
          customerId,
          invoice: mockInvoice,
          pdfUrl,
          emailServiceUrl: 'https://mock-email-service.com/send',
        },
        workflow: { id: workflowId },
      });

      // Mock the task service to return the generate PDF task with PDF URL
      taskService.getTaskById.mockResolvedValue({
        ...generatePdfTask,
        payload: {
          ...generatePdfTask.payload,
          pdfUrl,
        },
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
      expect(messagingService.publishTask).toHaveBeenCalledWith(
        TaskType.SEND_EMAIL,
        'send-email-task',
      );

      // Step 5: Handle send email completion
      await workflowService.handleSendEmailCompletion('send-email-task');

      // Verify workflow completion
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

    it('should handle workflow failure and create compensation task', async () => {
      const customerId = 'customer-123';
      const workflowId = 'workflow-123';
      const error = new Error('PDF generation failed');

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

      // Mock the task service to return a task for the failure scenario
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

    it('should handle no deliverable orders scenario', async () => {
      const customerId = 'customer-123';
      const workflowId = 'workflow-123';

      const fetchOrdersTask = TaskEntityMockFactory.create({
        id: 'fetch-orders-task',
        type: TaskType.FETCH_ORDERS,
        status: TaskStatus.COMPLETED,
        payload: {
          customerId,
          orders: [], // No deliverable orders
        },
        workflow: { id: workflowId },
      });

      taskService.getTaskById.mockResolvedValue(fetchOrdersTask as any);

      await workflowService.handleFetchOrdersCompletion('fetch-orders-task');

      // Should not create any additional tasks
      expect(taskService.createTask).not.toHaveBeenCalled();
      expect(messagingService.publishTask).not.toHaveBeenCalled();
    });
  });

  describe('Scheduled Workflows', () => {
    it('should create daily invoice workflow', async () => {
      const customerId = 'customer-123';
      const cronExpression = '0 0 * * *'; // Daily at midnight

      const mockTask = TaskEntityMockFactory.create({
        id: 'recurring-task',
        type: TaskType.FETCH_ORDERS,
        status: TaskStatus.PENDING,
        payload: {
          customerId,
          cronExpression,
          isRecurring: true,
        },
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

    it('should create weekly email workflow', async () => {
      const customerId = 'customer-123';
      const invoiceId = 'invoice-123';
      const scheduledAt = '2024-01-20T10:00:00Z'; // End of week

      const mockTask = TaskEntityMockFactory.create({
        id: 'scheduled-email-task',
        type: TaskType.SEND_EMAIL,
        status: TaskStatus.PENDING,
        payload: {
          customerId,
          invoiceId,
        },
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
        {
          customerId,
          invoiceId,
        },
        new Date(scheduledAt),
        undefined,
      );
    });
  });
});
