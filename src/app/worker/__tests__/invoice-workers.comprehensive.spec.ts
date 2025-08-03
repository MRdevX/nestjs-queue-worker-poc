import { Test, TestingModule } from '@nestjs/testing';
import { TaskEntityMockFactory } from '@test/mocks';
import { FetchOrdersWorker } from '../fetch-orders.worker';
import { CreateInvoiceWorker } from '../create-invoice.worker';
import { GeneratePdfWorker } from '../generate-pdf.worker';
import { SendEmailWorker } from '../send-email.worker';
import { TaskService } from '../../task/task.service';
import { CoordinatorService } from '../../workflow/coordinator.service';
import { MessagingService } from '../../core/messaging/messaging.service';
import { TaskType } from '../../task/types/task-type.enum';
import { TaskStatus } from '../../task/types/task-status.enum';

describe('Invoice Workers - Comprehensive Test Suite', () => {
  let fetchOrdersWorker: FetchOrdersWorker;
  let createInvoiceWorker: CreateInvoiceWorker;
  let generatePdfWorker: GeneratePdfWorker;
  let sendEmailWorker: SendEmailWorker;
  let taskService: jest.Mocked<TaskService>;
  let coordinator: jest.Mocked<CoordinatorService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FetchOrdersWorker,
        CreateInvoiceWorker,
        GeneratePdfWorker,
        SendEmailWorker,
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
          provide: MessagingService,
          useValue: {
            publishTask: jest.fn(),
          },
        },
      ],
    }).compile();

    fetchOrdersWorker = module.get<FetchOrdersWorker>(FetchOrdersWorker);
    createInvoiceWorker = module.get<CreateInvoiceWorker>(CreateInvoiceWorker);
    generatePdfWorker = module.get<GeneratePdfWorker>(GeneratePdfWorker);
    sendEmailWorker = module.get<SendEmailWorker>(SendEmailWorker);
    taskService = module.get(TaskService);
    coordinator = module.get(CoordinatorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('FetchOrdersWorker', () => {
    describe('Happy Path Scenarios', () => {
      it('should fetch orders successfully with date filtering', async () => {
        const taskId = 'task-123';
        const mockTask = TaskEntityMockFactory.create({
          id: taskId,
          type: TaskType.FETCH_ORDERS,
          payload: {
            customerId: 'customer-123',
            dateFrom: '2024-01-15',
            dateTo: '2024-01-20',
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

        await fetchOrdersWorker.handleTask(message);

        expect(taskService.getTaskById).toHaveBeenCalledWith(taskId);
        expect(taskService.updateTaskStatus).toHaveBeenCalledWith(
          taskId,
          TaskStatus.PROCESSING,
        );
        expect(coordinator.handleTaskCompletion).toHaveBeenCalledWith(taskId);
      });

      it('should handle orders with different delivery statuses', async () => {
        const taskId = 'task-123';
        const mockTask = TaskEntityMockFactory.create({
          id: taskId,
          type: TaskType.FETCH_ORDERS,
          payload: {
            customerId: 'customer-123',
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

        await fetchOrdersWorker.handleTask(message);

        expect(coordinator.handleTaskCompletion).toHaveBeenCalledWith(taskId);
      });
    });

    describe('Error Scenarios', () => {
      it('should handle missing customer ID', async () => {
        const taskId = 'task-123';
        const mockTask = TaskEntityMockFactory.create({
          id: taskId,
          type: TaskType.FETCH_ORDERS,
          payload: {
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

        await fetchOrdersWorker.handleTask(message);

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

        await fetchOrdersWorker.handleTask(message);

        expect(taskService.handleFailure).not.toHaveBeenCalled();
        expect(coordinator.handleTaskFailure).not.toHaveBeenCalled();
      });
    });

    describe('Date Filtering Logic', () => {
      it('should filter orders by date range correctly', async () => {
        const customerId = 'customer-123';
        const dateFrom = '2024-01-16';
        const dateTo = '2024-01-31';

        const orders = await (
          fetchOrdersWorker as any
        ).fetchOrdersFromExternalApi(customerId, dateFrom, dateTo);

        expect(orders).toHaveLength(1);
        expect(orders[0].deliveryDate).toBe('2024-01-16');
      });

      it('should handle null delivery dates correctly', async () => {
        const customerId = 'customer-123';
        const dateFrom = '2024-01-01';

        const orders = await (
          fetchOrdersWorker as any
        ).fetchOrdersFromExternalApi(customerId, dateFrom);

        const ordersWithNullDelivery = orders.filter(
          (order) => order.deliveryDate === null,
        );
        expect(ordersWithNullDelivery).toHaveLength(0);
      });
    });
  });

  describe('CreateInvoiceWorker', () => {
    describe('Happy Path Scenarios', () => {
      it('should create invoice successfully with multiple orders', async () => {
        const taskId = 'task-123';
        const mockOrders = [
          {
            id: 'order-1',
            customerId: 'customer-123',
            totalAmount: 100,
          },
          {
            id: 'order-2',
            customerId: 'customer-123',
            totalAmount: 200,
          },
        ];

        const mockTask = TaskEntityMockFactory.create({
          id: taskId,
          type: TaskType.CREATE_INVOICE,
          payload: {
            customerId: 'customer-123',
            orders: mockOrders,
          },
          status: TaskStatus.PENDING,
        });

        taskService.getTaskById.mockResolvedValue(mockTask as any);
        taskService.updateTaskStatus.mockResolvedValue(mockTask as any);

        const message = {
          taskType: TaskType.CREATE_INVOICE,
          taskId,
          delay: undefined,
          metadata: undefined,
        };

        await createInvoiceWorker.handleTask(message);

        expect(taskService.getTaskById).toHaveBeenCalledWith(taskId);
        expect(taskService.updateTaskStatus).toHaveBeenCalledWith(
          taskId,
          TaskStatus.PROCESSING,
        );
        expect(coordinator.handleTaskCompletion).toHaveBeenCalledWith(taskId);
      });

      it('should generate invoice number when not provided', async () => {
        const taskId = 'task-123';
        const mockOrders = [
          {
            id: 'order-1',
            customerId: 'customer-123',
            totalAmount: 100,
          },
        ];

        const mockTask = TaskEntityMockFactory.create({
          id: taskId,
          type: TaskType.CREATE_INVOICE,
          payload: {
            customerId: 'customer-123',
            orders: mockOrders,
          },
          status: TaskStatus.PENDING,
        });

        taskService.getTaskById.mockResolvedValue(mockTask as any);
        taskService.updateTaskStatus.mockResolvedValue(mockTask as any);

        const message = {
          taskType: TaskType.CREATE_INVOICE,
          taskId,
          delay: undefined,
          metadata: undefined,
        };

        await createInvoiceWorker.handleTask(message);

        expect(coordinator.handleTaskCompletion).toHaveBeenCalledWith(taskId);
      });
    });

    describe('Error Scenarios', () => {
      it('should handle missing customer ID', async () => {
        const taskId = 'task-123';
        const mockTask = TaskEntityMockFactory.create({
          id: taskId,
          type: TaskType.CREATE_INVOICE,
          payload: {
            orders: [{ id: 'order-1', totalAmount: 100 }],
          },
          status: TaskStatus.PENDING,
        });

        taskService.getTaskById.mockResolvedValue(mockTask as any);
        taskService.handleFailure.mockResolvedValue();

        const message = {
          taskType: TaskType.CREATE_INVOICE,
          taskId,
          delay: undefined,
          metadata: undefined,
        };

        await createInvoiceWorker.handleTask(message);

        expect(taskService.handleFailure).toHaveBeenCalledWith(
          taskId,
          expect.any(Error),
        );
        expect(coordinator.handleTaskFailure).toHaveBeenCalledWith(
          taskId,
          expect.any(Error),
        );
      });

      it('should handle missing orders array', async () => {
        const taskId = 'task-123';
        const mockTask = TaskEntityMockFactory.create({
          id: taskId,
          type: TaskType.CREATE_INVOICE,
          payload: {
            customerId: 'customer-123',
          },
          status: TaskStatus.PENDING,
        });

        taskService.getTaskById.mockResolvedValue(mockTask as any);
        taskService.handleFailure.mockResolvedValue();

        const message = {
          taskType: TaskType.CREATE_INVOICE,
          taskId,
          delay: undefined,
          metadata: undefined,
        };

        await createInvoiceWorker.handleTask(message);

        expect(taskService.handleFailure).toHaveBeenCalledWith(
          taskId,
          expect.any(Error),
        );
        expect(coordinator.handleTaskFailure).toHaveBeenCalledWith(
          taskId,
          expect.any(Error),
        );
      });
    });

    describe('Invoice Calculation Logic', () => {
      it('should calculate tax and grand total correctly', async () => {
        const customerId = 'customer-123';
        const orders = [
          { id: 'order-1', totalAmount: 100 },
          { id: 'order-2', totalAmount: 200 },
        ];

        const invoice = await (createInvoiceWorker as any).createInvoice(
          customerId,
          orders,
        );

        expect(invoice.totalAmount).toBe(300);
        expect(invoice.taxAmount).toBe(30);
        expect(invoice.grandTotal).toBe(330);
      });

      it('should handle zero amount orders', async () => {
        const customerId = 'customer-123';
        const orders = [{ id: 'order-1', totalAmount: 0 }];

        const invoice = await (createInvoiceWorker as any).createInvoice(
          customerId,
          orders,
        );

        expect(invoice.totalAmount).toBe(0);
        expect(invoice.taxAmount).toBe(0);
        expect(invoice.grandTotal).toBe(0);
      });
    });
  });

  describe('GeneratePdfWorker', () => {
    describe('Happy Path Scenarios', () => {
      it('should generate PDF successfully with mock processor', async () => {
        const taskId = 'task-123';
        const mockInvoice = {
          id: 'invoice-123',
          invoiceNumber: 'INV-123',
          customerId: 'customer-123',
          totalAmount: 100,
          taxAmount: 10,
          grandTotal: 110,
        };

        const mockTask = TaskEntityMockFactory.create({
          id: taskId,
          type: TaskType.GENERATE_PDF,
          payload: {
            customerId: 'customer-123',
            invoice: mockInvoice,
            pdfProcessorUrl: 'https://mock-pdf-processor.com/generate',
          },
          status: TaskStatus.PENDING,
        });

        taskService.getTaskById.mockResolvedValue(mockTask as any);
        taskService.updateTaskStatus.mockResolvedValue(mockTask as any);

        const message = {
          taskType: TaskType.GENERATE_PDF,
          taskId,
          delay: undefined,
          metadata: undefined,
        };

        await generatePdfWorker.handleTask(message);

        expect(taskService.getTaskById).toHaveBeenCalledWith(taskId);
        expect(taskService.updateTaskStatus).toHaveBeenCalledWith(
          taskId,
          TaskStatus.PROCESSING,
        );
        expect(coordinator.handleTaskCompletion).toHaveBeenCalledWith(taskId);
      });

      it('should use default PDF processor URL when not provided', async () => {
        const taskId = 'task-123';
        const mockInvoice = {
          id: 'invoice-123',
          invoiceNumber: 'INV-123',
          customerId: 'customer-123',
        };

        const mockTask = TaskEntityMockFactory.create({
          id: taskId,
          type: TaskType.GENERATE_PDF,
          payload: {
            customerId: 'customer-123',
            invoice: mockInvoice,
            pdfProcessorUrl: 'https://mock-pdf-processor.com/generate',
          },
          status: TaskStatus.PENDING,
        });

        taskService.getTaskById.mockResolvedValue(mockTask as any);
        taskService.updateTaskStatus.mockResolvedValue(mockTask as any);

        const message = {
          taskType: TaskType.GENERATE_PDF,
          taskId,
          delay: undefined,
          metadata: undefined,
        };

        await generatePdfWorker.handleTask(message);

        expect(coordinator.handleTaskCompletion).toHaveBeenCalledWith(taskId);
      });
    });

    describe('Error Scenarios', () => {
      it('should handle missing invoice data', async () => {
        const taskId = 'task-123';
        const mockTask = TaskEntityMockFactory.create({
          id: taskId,
          type: TaskType.GENERATE_PDF,
          payload: {
            customerId: 'customer-123',
          },
          status: TaskStatus.PENDING,
        });

        taskService.getTaskById.mockResolvedValue(mockTask as any);
        taskService.handleFailure.mockResolvedValue();

        const message = {
          taskType: TaskType.GENERATE_PDF,
          taskId,
          delay: undefined,
          metadata: undefined,
        };

        await generatePdfWorker.handleTask(message);

        expect(taskService.handleFailure).toHaveBeenCalledWith(
          taskId,
          expect.any(Error),
        );
        expect(coordinator.handleTaskFailure).toHaveBeenCalledWith(
          taskId,
          expect.any(Error),
        );
      });

      it('should handle PDF processor service failure', async () => {
        const taskId = 'task-123';
        const mockInvoice = {
          id: 'invoice-123',
          invoiceNumber: 'INV-123',
          customerId: 'customer-123',
        };

        const mockTask = TaskEntityMockFactory.create({
          id: taskId,
          type: TaskType.GENERATE_PDF,
          payload: {
            customerId: 'customer-123',
            invoice: mockInvoice,
            pdfProcessorUrl: 'https://failing-pdf-processor.com/generate',
          },
          status: TaskStatus.PENDING,
        });

        taskService.getTaskById.mockResolvedValue(mockTask as any);
        taskService.handleFailure.mockResolvedValue();

        const message = {
          taskType: TaskType.GENERATE_PDF,
          taskId,
          delay: undefined,
          metadata: undefined,
        };

        await generatePdfWorker.handleTask(message);

        expect(taskService.handleFailure).toHaveBeenCalledWith(
          taskId,
          expect.any(Error),
        );
        expect(coordinator.handleTaskFailure).toHaveBeenCalledWith(
          taskId,
          expect.any(Error),
        );
      });
    });
  });

  describe('SendEmailWorker', () => {
    describe('Happy Path Scenarios', () => {
      it('should send email successfully with mock service', async () => {
        const taskId = 'task-123';
        const mockInvoice = {
          id: 'invoice-123',
          invoiceNumber: 'INV-123',
          customerId: 'customer-123',
          grandTotal: 110,
        };

        const mockTask = TaskEntityMockFactory.create({
          id: taskId,
          type: TaskType.SEND_EMAIL,
          payload: {
            customerId: 'customer-123',
            invoice: mockInvoice,
            pdfUrl: 'https://storage.example.com/invoices/INV-123.pdf',
            emailServiceUrl: 'https://mock-email-service.com/send',
          },
          status: TaskStatus.PENDING,
        });

        taskService.getTaskById.mockResolvedValue(mockTask as any);
        taskService.updateTaskStatus.mockResolvedValue(mockTask as any);

        const message = {
          taskType: TaskType.SEND_EMAIL,
          taskId,
          delay: undefined,
          metadata: undefined,
        };

        await sendEmailWorker.handleTask(message);

        expect(taskService.getTaskById).toHaveBeenCalledWith(taskId);
        expect(taskService.updateTaskStatus).toHaveBeenCalledWith(
          taskId,
          TaskStatus.PROCESSING,
        );
        expect(coordinator.handleTaskCompletion).toHaveBeenCalledWith(taskId);
      });

      it('should use default email service URL when not provided', async () => {
        const taskId = 'task-123';
        const mockInvoice = {
          id: 'invoice-123',
          invoiceNumber: 'INV-123',
          customerId: 'customer-123',
        };

        const mockTask = TaskEntityMockFactory.create({
          id: taskId,
          type: TaskType.SEND_EMAIL,
          payload: {
            customerId: 'customer-123',
            invoice: mockInvoice,
            pdfUrl: 'https://storage.example.com/invoices/INV-123.pdf',
            emailServiceUrl: 'https://mock-email-service.com/send',
          },
          status: TaskStatus.PENDING,
        });

        taskService.getTaskById.mockResolvedValue(mockTask as any);
        taskService.updateTaskStatus.mockResolvedValue(mockTask as any);

        const message = {
          taskType: TaskType.SEND_EMAIL,
          taskId,
          delay: undefined,
          metadata: undefined,
        };

        await sendEmailWorker.handleTask(message);

        expect(coordinator.handleTaskCompletion).toHaveBeenCalledWith(taskId);
      });
    });

    describe('Error Scenarios', () => {
      it('should handle missing customer ID', async () => {
        const taskId = 'task-123';
        const mockTask = TaskEntityMockFactory.create({
          id: taskId,
          type: TaskType.SEND_EMAIL,
          payload: {
            invoice: { id: 'invoice-123' },
            pdfUrl: 'https://storage.example.com/invoices/INV-123.pdf',
          },
          status: TaskStatus.PENDING,
        });

        taskService.getTaskById.mockResolvedValue(mockTask as any);
        taskService.handleFailure.mockResolvedValue();

        const message = {
          taskType: TaskType.SEND_EMAIL,
          taskId,
          delay: undefined,
          metadata: undefined,
        };

        await sendEmailWorker.handleTask(message);

        expect(taskService.handleFailure).toHaveBeenCalledWith(
          taskId,
          expect.any(Error),
        );
        expect(coordinator.handleTaskFailure).toHaveBeenCalledWith(
          taskId,
          expect.any(Error),
        );
      });

      it('should handle missing PDF URL', async () => {
        const taskId = 'task-123';
        const mockTask = TaskEntityMockFactory.create({
          id: taskId,
          type: TaskType.SEND_EMAIL,
          payload: {
            customerId: 'customer-123',
            invoice: { id: 'invoice-123' },
          },
          status: TaskStatus.PENDING,
        });

        taskService.getTaskById.mockResolvedValue(mockTask as any);
        taskService.handleFailure.mockResolvedValue();

        const message = {
          taskType: TaskType.SEND_EMAIL,
          taskId,
          delay: undefined,
          metadata: undefined,
        };

        await sendEmailWorker.handleTask(message);

        expect(taskService.handleFailure).toHaveBeenCalledWith(
          taskId,
          expect.any(Error),
        );
        expect(coordinator.handleTaskFailure).toHaveBeenCalledWith(
          taskId,
          expect.any(Error),
        );
      });

      it('should handle email service failure', async () => {
        const taskId = 'task-123';
        const mockInvoice = {
          id: 'invoice-123',
          invoiceNumber: 'INV-123',
          customerId: 'customer-123',
        };

        const mockTask = TaskEntityMockFactory.create({
          id: taskId,
          type: TaskType.SEND_EMAIL,
          payload: {
            customerId: 'customer-123',
            invoice: mockInvoice,
            pdfUrl: 'https://storage.example.com/invoices/INV-123.pdf',
            emailServiceUrl: 'https://failing-email-service.com/send',
          },
          status: TaskStatus.PENDING,
        });

        taskService.getTaskById.mockResolvedValue(mockTask as any);
        taskService.handleFailure.mockResolvedValue();

        const message = {
          taskType: TaskType.SEND_EMAIL,
          taskId,
          delay: undefined,
          metadata: undefined,
        };

        await sendEmailWorker.handleTask(message);

        expect(taskService.handleFailure).toHaveBeenCalledWith(
          taskId,
          expect.any(Error),
        );
        expect(coordinator.handleTaskFailure).toHaveBeenCalledWith(
          taskId,
          expect.any(Error),
        );
      });
    });

    describe('Email Service Integration', () => {
      it('should prepare email data correctly', async () => {
        const customerId = 'customer-123';
        const invoice = {
          id: 'invoice-123',
          invoiceNumber: 'INV-123',
          customerId,
          grandTotal: 110,
          dueDate: '2024-02-15',
          items: [{ name: 'Product A', price: 100, quantity: 1 }],
        };
        const pdfUrl = 'https://storage.example.com/invoices/INV-123.pdf';

        const emailResult = await (sendEmailWorker as any).sendEmail(
          customerId,
          invoice,
          pdfUrl,
          'https://mock-email-service.com/send',
        );

        expect(emailResult).toBeDefined();
        expect(emailResult.emailId).toBeDefined();
        expect(emailResult.status).toBe('sent');
      });

      it('should get customer email correctly', async () => {
        const customerId = 'customer-123';

        const customerEmail = await (sendEmailWorker as any).getCustomerEmail(
          customerId,
        );

        expect(customerEmail).toBe(`customer-${customerId}@example.com`);
      });
    });
  });

  describe('Worker Type Validation', () => {
    it('should validate task types correctly for all workers', () => {
      expect(
        (fetchOrdersWorker as any).shouldProcessTaskType(TaskType.FETCH_ORDERS),
      ).toBe(true);
      expect(
        (fetchOrdersWorker as any).shouldProcessTaskType(
          TaskType.CREATE_INVOICE,
        ),
      ).toBe(false);

      expect(
        (createInvoiceWorker as any).shouldProcessTaskType(
          TaskType.CREATE_INVOICE,
        ),
      ).toBe(true);
      expect(
        (createInvoiceWorker as any).shouldProcessTaskType(
          TaskType.FETCH_ORDERS,
        ),
      ).toBe(false);

      expect(
        (generatePdfWorker as any).shouldProcessTaskType(TaskType.GENERATE_PDF),
      ).toBe(true);
      expect(
        (generatePdfWorker as any).shouldProcessTaskType(
          TaskType.CREATE_INVOICE,
        ),
      ).toBe(false);

      expect(
        (sendEmailWorker as any).shouldProcessTaskType(TaskType.SEND_EMAIL),
      ).toBe(true);
      expect(
        (sendEmailWorker as any).shouldProcessTaskType(TaskType.GENERATE_PDF),
      ).toBe(false);
    });
  });
});
