import * as request from 'supertest';
import { App } from 'supertest/types';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../app.module';
import { DatabaseSeeder } from '../../core/database/seeder/database.seeder';
import { TaskService } from '../../task/task.service';
import { InvoiceService } from '../invoice.service';
import { TaskStatus } from '../../task/types/task-status.enum';
import { TaskType } from '../../task/types/task-type.enum';

describe('Invoice Integration Tests', () => {
  let app: INestApplication<App>;
  let databaseSeeder: DatabaseSeeder;
  let taskService: TaskService;
  let invoiceService: InvoiceService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    await app.init();

    databaseSeeder = moduleFixture.get<DatabaseSeeder>(DatabaseSeeder);
    taskService = moduleFixture.get<TaskService>(TaskService);
    invoiceService = moduleFixture.get<InvoiceService>(InvoiceService);

    await databaseSeeder.clear();
    await databaseSeeder.seed({
      workflows: 2,
      tasksPerType: 3,
      customers: 5,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Invoice Workflow Endpoints', () => {
    describe('POST /invoice/workflow/start', () => {
      it('should start invoice workflow successfully', async () => {
        const workflowData = {
          customerId: 'customer-123',
          dateFrom: '2024-01-01',
          dateTo: '2024-01-31',
        };

        const response = await request(app.getHttpServer())
          .post('/invoice/workflow/start')
          .send(workflowData)
          .expect(201);

        expect(response.body).toMatchObject({
          message: 'Invoice workflow started',
          taskId: expect.any(String),
        });

        const task = await taskService.getTaskById(response.body.taskId);
        expect(task).toBeDefined();
        expect(task.type).toBe(TaskType.FETCH_ORDERS);
        expect(task.status).toBe(TaskStatus.PENDING);
        expect(task.payload.customerId).toBe('customer-123');
      });

      it('should handle missing customerId', async () => {
        const workflowData = {
          dateFrom: '2024-01-01',
          dateTo: '2024-01-31',
        };

        await request(app.getHttpServer())
          .post('/invoice/workflow/start')
          .send(workflowData)
          .expect(400);
      });

      it('should handle invalid date format', async () => {
        const workflowData = {
          customerId: 'customer-123',
          dateFrom: 'invalid-date',
          dateTo: '2024-01-31',
        };

        await request(app.getHttpServer())
          .post('/invoice/workflow/start')
          .send(workflowData)
          .expect(400);
      });
    });

    describe('POST /invoice/workflow/scheduled', () => {
      it('should create scheduled invoice workflow', async () => {
        const scheduledData = {
          customerId: 'customer-456',
          scheduledAt: new Date(Date.now() + 60000).toISOString(),
          dateFrom: '2024-01-01',
          dateTo: '2024-01-31',
        };

        const response = await request(app.getHttpServer())
          .post('/invoice/workflow/scheduled')
          .send(scheduledData)
          .expect(201);

        expect(response.body).toMatchObject({
          message: 'Scheduled invoice workflow created',
          taskId: expect.any(String),
          scheduledAt: scheduledData.scheduledAt,
        });

        const task = await taskService.getTaskById(response.body.taskId);
        expect(task).toBeDefined();
        expect(task.scheduledAt).toBeDefined();
      });

      it('should handle past scheduled date', async () => {
        const scheduledData = {
          customerId: 'customer-456',
          scheduledAt: new Date(Date.now() - 60000).toISOString(),
          dateFrom: '2024-01-01',
          dateTo: '2024-01-31',
        };

        const response = await request(app.getHttpServer())
          .post('/invoice/workflow/scheduled')
          .send(scheduledData)
          .expect(201);

        expect(response.body.taskId).toBeDefined();
      });
    });

    describe('POST /invoice/workflow/recurring', () => {
      it('should create recurring invoice workflow', async () => {
        const recurringData = {
          customerId: 'customer-789',
          cronExpression: '0 0 * * *',
          dateFrom: '2024-01-01',
          dateTo: '2024-01-31',
        };

        const response = await request(app.getHttpServer())
          .post('/invoice/workflow/recurring')
          .send(recurringData)
          .expect(201);

        expect(response.body).toMatchObject({
          message: 'Recurring invoice workflow created',
          taskId: expect.any(String),
          cronExpression: '0 0 * * *',
        });

        const task = await taskService.getTaskById(response.body.taskId);
        expect(task).toBeDefined();
        expect(task.payload.cronExpression).toBe('0 0 * * *');
        expect(task.payload.isRecurring).toBe(true);
      });

      it('should handle invalid cron expression', async () => {
        const recurringData = {
          customerId: 'customer-789',
          cronExpression: 'invalid-cron',
          dateFrom: '2024-01-01',
          dateTo: '2024-01-31',
        };

        await request(app.getHttpServer())
          .post('/invoice/workflow/recurring')
          .send(recurringData)
          .expect(400);
      });
    });

    describe('POST /invoice/email/scheduled', () => {
      it('should create scheduled email workflow', async () => {
        const emailData = {
          customerId: 'customer-999',
          invoiceId: 'invoice-123',
          scheduledAt: new Date(Date.now() + 120000).toISOString(),
        };

        const response = await request(app.getHttpServer())
          .post('/invoice/email/scheduled')
          .send(emailData)
          .expect(201);

        expect(response.body).toMatchObject({
          message: 'Scheduled email workflow created',
          taskId: expect.any(String),
          scheduledAt: expect.any(String),
        });

        const task = await taskService.getTaskById(response.body.taskId);
        expect(task).toBeDefined();
        expect(task.type).toBe(TaskType.SEND_EMAIL);
        expect(task.scheduledAt).toBeDefined();
      });
    });
  });

  describe('Invoice Query Endpoints', () => {
    describe('GET /invoice/tasks/:customerId', () => {
      it('should return customer invoice tasks', async () => {
        const customerId = 'customer-query-test';
        await taskService.createTask(TaskType.FETCH_ORDERS, {
          customerId,
          dateFrom: '2024-01-01',
          dateTo: '2024-01-31',
        });

        await taskService.createTask(TaskType.CREATE_INVOICE, {
          customerId,
          orders: [],
        });

        const response = await request(app.getHttpServer())
          .get(`/invoice/tasks/${customerId}`)
          .expect(200);

        expect(response.body).toMatchObject({
          customerId,
          tasks: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              type: expect.any(String),
              status: expect.any(String),
              createdAt: expect.any(String),
            }),
          ]),
        });

        expect(response.body.tasks.length).toBeGreaterThanOrEqual(2);
      });

      it('should return empty array for non-existent customer', async () => {
        const response = await request(app.getHttpServer())
          .get('/invoice/tasks/non-existent-customer')
          .expect(200);

        expect(response.body).toMatchObject({
          customerId: 'non-existent-customer',
          tasks: [],
        });
      });
    });

    describe('GET /invoice/status/:customerId', () => {
      it('should return invoice workflow status', async () => {
        const customerId = 'customer-status-test';

        const task1 = await taskService.createTask(TaskType.FETCH_ORDERS, {
          customerId,
          dateFrom: '2024-01-01',
          dateTo: '2024-01-31',
        });
        await taskService.updateTaskStatus(task1.id, TaskStatus.COMPLETED);

        const task2 = await taskService.createTask(TaskType.CREATE_INVOICE, {
          customerId,
          orders: [],
        });
        await taskService.updateTaskStatus(task2.id, TaskStatus.FAILED);

        await taskService.createTask(TaskType.GENERATE_PDF, {
          customerId,
          invoice: {},
        });

        const response = await request(app.getHttpServer())
          .get(`/invoice/status/${customerId}`)
          .expect(200);

        expect(response.body).toMatchObject({
          customerId,
          totalTasks: 3,
          completedTasks: 1,
          failedTasks: 1,
          pendingTasks: 1,
          processingTasks: 0,
          workflows: expect.any(Object),
        });
      });

      it('should handle customer with no tasks', async () => {
        const response = await request(app.getHttpServer())
          .get('/invoice/status/customer-no-tasks')
          .expect(200);

        expect(response.body).toMatchObject({
          customerId: 'customer-no-tasks',
          totalTasks: 0,
          completedTasks: 0,
          failedTasks: 0,
          pendingTasks: 0,
          processingTasks: 0,
          workflows: {},
        });
      });
    });
  });

  describe('Invoice Workflow Chain', () => {
    it('should simulate complete invoice workflow', async () => {
      const customerId = 'customer-workflow-test';

      const startResponse = await request(app.getHttpServer())
        .post('/invoice/workflow/start')
        .send({
          customerId,
          dateFrom: '2024-01-01',
          dateTo: '2024-01-31',
        })
        .expect(201);

      const initialTaskId = startResponse.body.taskId;

      const fetchOrdersTask = await taskService.getTaskById(initialTaskId);
      await taskService.updateTaskPayload(initialTaskId, {
        ...fetchOrdersTask.payload,
        orders: [
          {
            id: 'order-1',
            customerId,
            status: 'delivered',
            items: [
              { id: 'item-1', name: 'Product A', price: 100, quantity: 2 },
            ],
            totalAmount: 200,
          },
        ],
      });
      await taskService.updateTaskStatus(initialTaskId, TaskStatus.COMPLETED);

      const allTasks = await taskService.findTasks({});
      const createInvoiceTask = allTasks.find(
        (task) => task.type === TaskType.CREATE_INVOICE,
      );
      expect(createInvoiceTask).toBeDefined();

      expect(createInvoiceTask).toBeDefined();
      await taskService.updateTaskPayload(createInvoiceTask!.id, {
        ...createInvoiceTask!.payload,
        invoice: {
          id: 'invoice-1',
          customerId,
          totalAmount: 200,
          grandTotal: 220,
        },
      });
      await taskService.updateTaskStatus(
        createInvoiceTask!.id,
        TaskStatus.COMPLETED,
      );

      const updatedTasks = await taskService.findTasks({});
      const generatePdfTask = updatedTasks.find(
        (task) => task.type === TaskType.GENERATE_PDF,
      );
      expect(generatePdfTask).toBeDefined();

      expect(generatePdfTask).toBeDefined();
      await taskService.updateTaskPayload(generatePdfTask!.id, {
        ...generatePdfTask!.payload,
        pdfUrl: 'https://storage.example.com/invoice-1.pdf',
      });
      await taskService.updateTaskStatus(
        generatePdfTask!.id,
        TaskStatus.COMPLETED,
      );

      const finalTasks = await taskService.findTasks({});
      const sendEmailTask = finalTasks.find(
        (task) => task.type === TaskType.SEND_EMAIL,
      );
      expect(sendEmailTask).toBeDefined();

      expect(sendEmailTask).toBeDefined();
      await taskService.updateTaskStatus(
        sendEmailTask!.id,
        TaskStatus.COMPLETED,
      );

      const statusResponse = await request(app.getHttpServer())
        .get(`/invoice/status/${customerId}`)
        .expect(200);

      expect(statusResponse.body).toMatchObject({
        customerId,
        totalTasks: 2,
        completedTasks: 1,
        failedTasks: 0,
        pendingTasks: 1,
        processingTasks: 0,
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle task failures and create compensation tasks', async () => {
      const customerId = 'customer-error-test';

      const task = await taskService.createTask(TaskType.FETCH_ORDERS, {
        customerId,
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31',
      });

      await invoiceService.handleTaskFailure(
        task.id,
        new Error('Network timeout'),
      );

      const allTasks = await taskService.findTasks({});
      const compensationTask = allTasks.find(
        (t) =>
          t.type === TaskType.COMPENSATION &&
          t.payload.customerId === customerId,
      );

      expect(compensationTask).toBeDefined();
      expect(compensationTask!.payload.originalTaskId).toBe(task.id);
      expect(compensationTask!.payload.originalTaskType).toBe(
        TaskType.FETCH_ORDERS,
      );
      expect(compensationTask!.payload.reason).toBe('Network timeout');
    });

    it('should handle retry mechanism', async () => {
      const customerId = 'customer-retry-test';

      const task = await taskService.createTask(TaskType.FETCH_ORDERS, {
        customerId,
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31',
      });

      await taskService.handleFailure(task.id, new Error('Temporary failure'));

      const updatedTask = await taskService.getTaskById(task.id);
      expect(updatedTask.retries).toBe(1);
      expect(updatedTask.status).toBe(TaskStatus.PENDING);

      for (let i = 0; i < 2; i++) {
        await taskService.handleFailure(
          task.id,
          new Error('Persistent failure'),
        );
      }

      const finalTask = await taskService.getTaskById(task.id);
      expect(finalTask.retries).toBe(3);
      expect(finalTask.status).toBe(TaskStatus.FAILED);
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent invoice requests', async () => {
      const concurrentRequests = 5;
      const promises: Promise<any>[] = [];

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(app.getHttpServer())
            .post('/invoice/workflow/start')
            .send({
              customerId: `customer-concurrent-${i}`,
              dateFrom: '2024-01-01',
              dateTo: '2024-01-31',
            }),
        );
      }

      const results = await Promise.all(promises);

      results.forEach((result) => {
        expect(result.status).toBe(201);
        expect(result.body.taskId).toBeDefined();
      });

      expect(results).toHaveLength(concurrentRequests);
    }, 10000);
  });
});
