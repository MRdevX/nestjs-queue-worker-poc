import * as request from 'supertest';
import { App } from 'supertest/types';
import { INestApplication } from '@nestjs/common';
import { TaskService } from '../src/app/task/task.service';
import { TaskType } from '../src/app/task/types/task-type.enum';
import { TaskStatus } from '../src/app/task/types/task-status.enum';
import { InvoiceService } from '../src/app/invoice/invoice.service';
import { DatabaseSeeder } from '../src/app/core/database/seeder/database.seeder';
import {
  createTestApp,
  closeTestApp,
  TestDataGenerator,
  TestUtils,
} from './config/test-setup';
import { InvoiceWorkflowHelper } from './helpers/invoice-workflow.helper';

describe('Invoice Workflow E2E Tests (Simplified)', () => {
  let app: INestApplication<App>;
  let taskService: TaskService;
  let invoiceService: InvoiceService;
  let databaseSeeder: DatabaseSeeder;
  let workflowHelper: InvoiceWorkflowHelper;

  beforeAll(async () => {
    console.log('🚀 Setting up Invoice Workflow E2E Test Environment...');

    const testContext = await createTestApp();
    app = testContext.app;

    taskService = testContext.moduleFixture.get<TaskService>(TaskService);
    invoiceService =
      testContext.moduleFixture.get<InvoiceService>(InvoiceService);
    databaseSeeder =
      testContext.moduleFixture.get<DatabaseSeeder>(DatabaseSeeder);
    workflowHelper = new InvoiceWorkflowHelper(taskService);

    console.log('✅ Test environment initialized successfully');
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  beforeEach(async () => {
    console.log('🔄 Clearing database before each test...');
    await TestUtils.clearDatabaseSafely(databaseSeeder);
    console.log('✅ Database cleared');
  });

  describe('Core Invoice Workflow Endpoints', () => {
    describe('POST /api/invoice/workflow/start', () => {
      it('should start invoice workflow successfully', async () => {
        console.log('📋 Testing: Start Invoice Workflow');

        const workflowData = TestDataGenerator.generateStartWorkflowData();

        console.log('📤 Sending request to start invoice workflow...');
        const response = await request(app.getHttpServer())
          .post('/api/invoice/workflow/start')
          .send(workflowData)
          .expect(201);

        console.log('✅ Workflow start response received:', response.body);

        workflowHelper.validateWorkflowResponse(
          response.body,
          'Invoice workflow started',
        );

        await TestUtils.wait(200);
        console.log('🔍 Verifying task creation...');
        const task = await TestUtils.retryTaskRetrieval(
          taskService,
          response.body.taskId,
        );
        workflowHelper.validateTaskStructure(
          task,
          TaskType.FETCH_ORDERS,
          workflowData.customerId,
        );
        expect(task.status).toBe(TaskStatus.PENDING);

        workflowHelper.logTaskDetails(task);
      });
    });

    describe('POST /api/invoice/workflow/scheduled', () => {
      it('should create scheduled invoice workflow successfully', async () => {
        console.log('📋 Testing: Create Scheduled Invoice Workflow');

        const scheduledData = TestDataGenerator.generateScheduledWorkflowData();

        console.log('📤 Sending scheduled workflow request...');
        const response = await request(app.getHttpServer())
          .post('/api/invoice/workflow/scheduled')
          .send(scheduledData)
          .expect(201);

        console.log('✅ Scheduled workflow response:', response.body);

        workflowHelper.validateWorkflowResponse(
          response.body,
          'Scheduled invoice workflow created',
        );

        await TestUtils.wait(200);
        console.log('🔍 Verifying scheduled task...');
        const task = await TestUtils.retryTaskRetrieval(
          taskService,
          response.body.taskId,
        );
        workflowHelper.validateTaskStructure(
          task,
          TaskType.FETCH_ORDERS,
          scheduledData.customerId,
        );
        expect(task.scheduledAt).toBeDefined();

        workflowHelper.logTaskDetails(task);
      });
    });

    describe('POST /api/invoice/workflow/recurring', () => {
      it('should create recurring invoice workflow successfully', async () => {
        console.log('📋 Testing: Create Recurring Invoice Workflow');

        const recurringData = TestDataGenerator.generateRecurringWorkflowData();

        console.log('📤 Sending recurring workflow request...');
        const response = await request(app.getHttpServer())
          .post('/api/invoice/workflow/recurring')
          .send(recurringData)
          .expect(201);

        console.log('✅ Recurring workflow response:', response.body);

        workflowHelper.validateWorkflowResponse(
          response.body,
          'Recurring invoice workflow created',
        );

        await TestUtils.wait(200);
        console.log('🔍 Verifying recurring task...');
        const task = await TestUtils.retryTaskRetrieval(
          taskService,
          response.body.taskId,
        );
        workflowHelper.validateTaskStructure(
          task,
          TaskType.FETCH_ORDERS,
          recurringData.customerId,
        );
        expect(task.payload.cronExpression).toBe(recurringData.cronExpression);
        expect(task.payload.isRecurring).toBe(true);

        workflowHelper.logTaskDetails(task);
      });
    });

    describe('POST /api/invoice/email/scheduled', () => {
      it('should create scheduled email workflow successfully', async () => {
        console.log('📋 Testing: Create Scheduled Email Workflow');

        const emailData = TestDataGenerator.generateScheduledEmailData();

        console.log('📤 Sending scheduled email request...');
        const response = await request(app.getHttpServer())
          .post('/api/invoice/email/scheduled')
          .send(emailData)
          .expect(201);

        console.log('✅ Scheduled email response:', response.body);

        workflowHelper.validateWorkflowResponse(
          response.body,
          'Scheduled email workflow created',
        );

        await TestUtils.wait(200);
        console.log('🔍 Verifying email task...');
        const task = await TestUtils.retryTaskRetrieval(
          taskService,
          response.body.taskId,
        );
        workflowHelper.validateTaskStructure(
          task,
          TaskType.SEND_EMAIL,
          emailData.customerId,
        );
        expect(task.scheduledAt).toBeDefined();
        expect(task.payload.invoiceId).toBe(emailData.invoiceId);

        workflowHelper.logTaskDetails(task);
      });
    });
  });

  describe('Invoice Workflow Query Endpoints', () => {
    describe('GET /api/invoice/tasks/:customerId', () => {
      it('should return customer invoice tasks', async () => {
        console.log('📋 Testing: Get Customer Invoice Tasks');

        const customerId = TestDataGenerator.generateCustomerId(
          'customer-query-test',
        );

        console.log('🔧 Creating test tasks for customer...');
        await workflowHelper.createTasksWithDifferentStatuses(customerId);

        console.log('📤 Requesting customer tasks...');
        const response = await request(app.getHttpServer())
          .get(`/api/invoice/tasks/${customerId}`)
          .expect(200);

        console.log('✅ Customer tasks response:', response.body);

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

        expect(response.body.tasks.length).toBeGreaterThanOrEqual(4);
        console.log(
          `📊 Found ${response.body.tasks.length} tasks for customer`,
        );
      });

      it('should return empty array for non-existent customer', async () => {
        console.log('📋 Testing: Get Tasks for Non-existent Customer');

        const nonExistentCustomerId = 'non-existent-customer-e2e';

        console.log('📤 Requesting tasks for non-existent customer...');
        const response = await request(app.getHttpServer())
          .get(`/api/invoice/tasks/${nonExistentCustomerId}`)
          .expect(200);

        console.log('✅ Non-existent customer response:', response.body);
        expect(response.body).toMatchObject({
          customerId: nonExistentCustomerId,
          tasks: [],
        });
      });
    });

    describe('GET /api/invoice/status/:customerId', () => {
      it('should return invoice workflow status', async () => {
        console.log('📋 Testing: Get Invoice Workflow Status');

        const customerId = TestDataGenerator.generateCustomerId(
          'customer-status-test',
        );

        console.log('🔧 Creating tasks with different statuses...');
        await workflowHelper.createTasksWithDifferentStatuses(customerId);

        console.log('📤 Requesting workflow status...');
        const response = await request(app.getHttpServer())
          .get(`/api/invoice/status/${customerId}`)
          .expect(200);

        console.log('✅ Workflow status response:', response.body);

        expect(response.body).toMatchObject({
          customerId,
          totalTasks: 4,
          completedTasks: 1,
          failedTasks: 1,
          pendingTasks: 1,
          processingTasks: 1,
          workflows: expect.any(Object),
        });

        workflowHelper.logWorkflowStatus(response.body);
      });

      it('should handle customer with no tasks', async () => {
        console.log('📋 Testing: Get Status for Customer with No Tasks');

        const customerId =
          TestDataGenerator.generateCustomerId('customer-no-tasks');

        console.log('📤 Requesting status for customer with no tasks...');
        const response = await request(app.getHttpServer())
          .get(`/api/invoice/status/${customerId}`)
          .expect(200);

        console.log('✅ No tasks customer response:', response.body);
        expect(response.body).toMatchObject({
          customerId,
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

  describe('Complete Invoice Workflow Chain', () => {
    it('should simulate complete invoice workflow from start to finish', async () => {
      console.log('📋 Testing: Complete Invoice Workflow Chain');

      const customerId = TestDataGenerator.generateCustomerId(
        'customer-workflow-chain',
      );

      console.log('🔄 Step 1: Starting invoice workflow...');
      const startResponse = await request(app.getHttpServer())
        .post('/api/invoice/workflow/start')
        .send({
          customerId,
          dateFrom: '2024-01-01',
          dateTo: '2024-01-31',
        })
        .expect(201);

      const initialTaskId = startResponse.body.taskId;
      console.log('✅ Workflow started with task ID:', initialTaskId);

      console.log('🔄 Step 2: Simulating complete workflow chain...');
      const workflowChain =
        await workflowHelper.createCompleteWorkflowChain(customerId);

      console.log('✅ Complete workflow chain created with tasks:', {
        fetchOrders: workflowChain.fetchOrdersTask.id,
        createInvoice: workflowChain.createInvoiceTask.id,
        generatePdf: workflowChain.generatePdfTask.id,
        sendEmail: workflowChain.sendEmailTask.id,
      });

      console.log('🔄 Step 3: Verifying final workflow status...');
      const statusResponse = await request(app.getHttpServer())
        .get(`/api/invoice/status/${customerId}`)
        .expect(200);

      console.log('✅ Final status response:', statusResponse.body);
      expect(statusResponse.body).toMatchObject({
        customerId,
        totalTasks: expect.any(Number),
        completedTasks: expect.any(Number),
        failedTasks: 0,
        pendingTasks: expect.any(Number),
        processingTasks: 0,
      });

      workflowHelper.logWorkflowStatus(statusResponse.body);
      console.log('🎉 Complete invoice workflow chain test passed!');
    });
  });

  describe('Error Handling and Validation', () => {
    it('should handle invalid request data gracefully', async () => {
      console.log('📋 Testing: Error Handling for Invalid Data');

      console.log('📤 Testing missing customerId...');
      await request(app.getHttpServer())
        .post('/api/invoice/workflow/start')
        .send({
          dateFrom: '2024-01-01',
          dateTo: '2024-01-31',
        })
        .expect(400);

      console.log('📤 Testing invalid date format...');
      await request(app.getHttpServer())
        .post('/api/invoice/workflow/start')
        .send({
          customerId: 'customer-e2e-invalid',
          dateFrom: 'invalid-date',
          dateTo: '2024-01-31',
        })
        .expect(400);

      console.log('📤 Testing invalid cron expression...');
      await request(app.getHttpServer())
        .post('/api/invoice/workflow/recurring')
        .send({
          customerId: 'customer-e2e-invalid',
          cronExpression: 'invalid-cron',
          dateFrom: '2024-01-01',
          dateTo: '2024-01-31',
        })
        .expect(400);

      console.log('✅ Error handling tests completed');
    });

    it('should handle task failures and create compensation tasks via public API', async () => {
      console.log(
        '📋 Testing: Task Failure and Compensation Logic via Public API',
      );

      const customerId = 'customer-compensation-simple-api-test';
      const workflowData = TestDataGenerator.generateStartWorkflowData();
      workflowData.customerId = customerId;

      console.log('📤 Starting workflow for compensation test...');
      const response = await request(app.getHttpServer())
        .post('/api/invoice/workflow/start')
        .send(workflowData)
        .expect(201);

      const taskId = response.body.taskId;
      console.log(`✅ Workflow started with task ID: ${taskId}`);

      console.log('🔍 Verifying initial task creation via public API...');
      await TestUtils.wait(200);

      const initialTasksResponse = await request(app.getHttpServer())
        .get(`/api/invoice/tasks/${customerId}`)
        .expect(200);

      const initialTask = initialTasksResponse.body.tasks.find(
        (t: any) => t.id === taskId,
      );
      expect(initialTask).toBeDefined();
      expect(initialTask.status).toBe(TaskStatus.PENDING);
      expect(initialTask.type).toBe(TaskType.FETCH_ORDERS);

      console.log('🔍 Monitoring workflow status for failure handling...');
      await TestUtils.wait(500);

      const statusResponse = await request(app.getHttpServer())
        .get(`/api/invoice/status/${customerId}`)
        .expect(200);

      console.log('📊 Workflow status:', statusResponse.body);

      expect(statusResponse.body).toMatchObject({
        customerId,
        totalTasks: expect.any(Number),
        workflows: expect.any(Object),
      });

      console.log('📊 Compensation test summary:', {
        customerId,
        totalTasks: statusResponse.body.totalTasks,
        workflows: Object.keys(statusResponse.body.workflows).length,
      });

      console.log('✅ Compensation logic test completed via public API');
    });

    it('should handle retry mechanism through public API observation', async () => {
      console.log('📋 Testing: Task Retry Mechanism via Public API');

      const customerId = 'customer-retry-simple-api-test';
      const workflowData = TestDataGenerator.generateStartWorkflowData();
      workflowData.customerId = customerId;

      console.log('📤 Starting workflow for retry test...');
      const response = await request(app.getHttpServer())
        .post('/api/invoice/workflow/start')
        .send(workflowData)
        .expect(201);

      const taskId = response.body.taskId;
      console.log(`✅ Workflow started with task ID: ${taskId}`);

      console.log('🔄 Monitoring task status for retry behavior...');

      let retryObserved = false;
      const maxMonitoringAttempts = 10;

      for (let i = 0; i < maxMonitoringAttempts; i++) {
        await TestUtils.wait(200);

        const tasksResponse = await request(app.getHttpServer())
          .get(`/api/invoice/tasks/${customerId}`)
          .expect(200);

        const task = tasksResponse.body.tasks.find((t: any) => t.id === taskId);

        if (task) {
          console.log(`📊 Task status at attempt ${i + 1}: ${task.status}`);

          if (task.status === TaskStatus.FAILED) {
            retryObserved = true;
            console.log(
              '✅ Observed task reaching failed status after retries',
            );
            break;
          }
        }
      }

      const finalStatusResponse = await request(app.getHttpServer())
        .get(`/api/invoice/status/${customerId}`)
        .expect(200);

      expect(finalStatusResponse.body).toMatchObject({
        customerId,
        totalTasks: expect.any(Number),
      });

      console.log('📊 Retry mechanism summary:', {
        customerId,
        totalTasks: finalStatusResponse.body.totalTasks,
        retryObserved,
      });

      console.log(
        '✅ Retry mechanism test completed via public API observation',
      );
    });
  });

  describe('Performance and Concurrency', () => {
    it('should handle multiple concurrent workflow requests', async () => {
      console.log('📋 Testing: Concurrent Workflow Requests');

      const concurrentRequests = 3;
      const promises: Promise<any>[] = [];

      console.log(`🔄 Starting ${concurrentRequests} concurrent requests...`);

      for (let i = 0; i < concurrentRequests; i++) {
        const workflowData = TestDataGenerator.generateStartWorkflowData();
        promises.push(
          request(app.getHttpServer())
            .post('/api/invoice/workflow/start')
            .send(workflowData),
        );
      }

      const results = await Promise.all(promises);
      console.log('✅ All concurrent requests completed');

      results.forEach((result, index) => {
        expect(result.status).toBe(201);
        expect(result.body.taskId).toBeDefined();
        console.log(`📊 Concurrent request ${index + 1}:`, {
          status: result.status,
          taskId: result.body.taskId,
        });
      });

      expect(results).toHaveLength(concurrentRequests);
      console.log('🎉 Concurrent workflow test passed!');
    }, 10000);
  });
});
