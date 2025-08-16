import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../app.module';
import { DatabaseSeeder } from '../../core/database/seeder/database.seeder';
import { TaskService } from '../../task/task.service';
import { TaskStatus } from '../../task/types/task-status.enum';
import { TaskType } from '../../task/types/task-type.enum';

describe('Invoice Integration Tests', () => {
  let app: INestApplication;
  let databaseSeeder: DatabaseSeeder;
  let taskService: TaskService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    databaseSeeder = moduleFixture.get<DatabaseSeeder>(DatabaseSeeder);
    taskService = moduleFixture.get<TaskService>(TaskService);

    // Clear and seed database
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
          workflowId: 'workflow-123',
        };

        const response = await request(app.getHttpServer())
          .post('/invoice/workflow/start')
          .send(workflowData)
          .expect(201);

        expect(response.body).toMatchObject({
          message: 'Invoice workflow started',
          taskId: expect.any(String),
          workflowId: 'workflow-123',
        });

        // Verify task was created
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
          scheduledAt: new Date(Date.now() + 60000).toISOString(), // 1 minute from now
          dateFrom: '2024-01-01',
          dateTo: '2024-01-31',
          workflowId: 'workflow-456',
        };

        const response = await request(app.getHttpServer())
          .post('/invoice/workflow/scheduled')
          .send(scheduledData)
          .expect(201);

        expect(response.body).toMatchObject({
          message: 'Scheduled invoice workflow created',
          taskId: expect.any(String),
          workflowId: 'workflow-456',
          scheduledAt: scheduledData.scheduledAt,
        });

        // Verify scheduled task
        const task = await taskService.getTaskById(response.body.taskId);
        expect(task).toBeDefined();
        expect(task.scheduledAt).toBeDefined();
      });

      it('should handle past scheduled date', async () => {
        const scheduledData = {
          customerId: 'customer-456',
          scheduledAt: new Date(Date.now() - 60000).toISOString(), // 1 minute ago
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
          cronExpression: '0 0 * * *', // Daily at midnight
          dateFrom: '2024-01-01',
          dateTo: '2024-01-31',
          workflowId: 'workflow-789',
        };

        const response = await request(app.getHttpServer())
          .post('/invoice/workflow/recurring')
          .send(recurringData)
          .expect(201);

        expect(response.body).toMatchObject({
          message: 'Recurring invoice workflow created',
          taskId: expect.any(String),
          cronExpression: '0 0 * * *',
          workflowId: 'workflow-789',
        });

        // Verify recurring task
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
          scheduledAt: new Date(Date.now() + 120000).toISOString(), // 2 minutes from now
          workflowId: 'workflow-999',
        };

        const response = await request(app.getHttpServer())
          .post('/invoice/email/scheduled')
          .send(emailData)
          .expect(201);

        expect(response.body).toMatchObject({
          message: 'Scheduled email workflow created',
          taskId: expect.any(String),
          workflowId: 'workflow-999',
          scheduledAt: expect.any(String),
        });

        // Verify scheduled email task
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
        // First create some tasks for the customer
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

        // Create tasks with different statuses
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

        const task3 = await taskService.createTask(TaskType.GENERATE_PDF, {
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

      // 1. Start workflow
      const startResponse = await request(app.getHttpServer())
        .post('/invoice/workflow/start')
        .send({
          customerId,
          dateFrom: '2024-01-01',
          dateTo: '2024-01-31',
          workflowId: 'workflow-test',
        })
        .expect(201);

      const initialTaskId = startResponse.body.taskId;

      // 2. Simulate FETCH_ORDERS completion
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

      // 3. Check that CREATE_INVOICE task was created
      const allTasks = await taskService.findTasks({
        workflowId: 'workflow-test',
      });
      const createInvoiceTask = allTasks.find(
        (task) => task.type === TaskType.CREATE_INVOICE,
      );
      expect(createInvoiceTask).toBeDefined();

      // 4. Simulate CREATE_INVOICE completion
      await taskService.updateTaskPayload(createInvoiceTask.id, {
        ...createInvoiceTask.payload,
        invoice: {
          id: 'invoice-1',
          customerId,
          totalAmount: 200,
          grandTotal: 220,
        },
      });
      await taskService.updateTaskStatus(
        createInvoiceTask.id,
        TaskStatus.COMPLETED,
      );

      // 5. Check that GENERATE_PDF task was created
      const updatedTasks = await taskService.findTasks({
        workflowId: 'workflow-test',
      });
      const generatePdfTask = updatedTasks.find(
        (task) => task.type === TaskType.GENERATE_PDF,
      );
      expect(generatePdfTask).toBeDefined();

      // 6. Simulate GENERATE_PDF completion
      await taskService.updateTaskPayload(generatePdfTask.id, {
        ...generatePdfTask.payload,
        pdfUrl: 'https://storage.example.com/invoice-1.pdf',
      });
      await taskService.updateTaskStatus(
        generatePdfTask.id,
        TaskStatus.COMPLETED,
      );

      // 7. Check that SEND_EMAIL task was created
      const finalTasks = await taskService.findTasks({
        workflowId: 'workflow-test',
      });
      const sendEmailTask = finalTasks.find(
        (task) => task.type === TaskType.SEND_EMAIL,
      );
      expect(sendEmailTask).toBeDefined();

      // 8. Simulate SEND_EMAIL completion
      await taskService.updateTaskStatus(
        sendEmailTask.id,
        TaskStatus.COMPLETED,
      );

      // 9. Verify final status
      const statusResponse = await request(app.getHttpServer())
        .get(`/invoice/status/${customerId}`)
        .expect(200);

      expect(statusResponse.body).toMatchObject({
        customerId,
        totalTasks: 4,
        completedTasks: 4,
        failedTasks: 0,
        pendingTasks: 0,
        processingTasks: 0,
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle task failures and create compensation tasks', async () => {
      const customerId = 'customer-error-test';

      // Create a task that will fail
      const task = await taskService.createTask(TaskType.FETCH_ORDERS, {
        customerId,
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31',
      });

      // Simulate task failure
      await taskService.updateTaskStatus(
        task.id,
        TaskStatus.FAILED,
        'Network timeout',
      );

      // Check that compensation task was created
      const allTasks = await taskService.findTasks({ customerId });
      const compensationTask = allTasks.find(
        (t) => t.type === TaskType.COMPENSATION,
      );

      expect(compensationTask).toBeDefined();
      expect(compensationTask.payload.originalTaskId).toBe(task.id);
      expect(compensationTask.payload.originalTaskType).toBe(
        TaskType.FETCH_ORDERS,
      );
      expect(compensationTask.payload.reason).toBe('Network timeout');
    });

    it('should handle retry mechanism', async () => {
      const customerId = 'customer-retry-test';

      const task = await taskService.createTask(TaskType.FETCH_ORDERS, {
        customerId,
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31',
      });

      // Simulate retry
      await taskService.handleFailure(task.id, new Error('Temporary failure'));

      const updatedTask = await taskService.getTaskById(task.id);
      expect(updatedTask.retries).toBe(1);
      expect(updatedTask.status).toBe(TaskStatus.PENDING);

      // Simulate max retries
      for (let i = 0; i < 3; i++) {
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
      const promises = [];

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
    }, 10000); // 10 second timeout
  });
});
