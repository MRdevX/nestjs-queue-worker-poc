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

describe('Invoice Workflow E2E Tests', () => {
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

  describe('Invoice Workflow Success Scenarios', () => {
    describe('POST /api/invoice/workflow/start', () => {
      it('should start invoice workflow successfully and create initial task', async () => {
        console.log('📋 Testing: Start Invoice Workflow');

        const workflowData = TestDataGenerator.generateStartWorkflowData();

        console.log('📤 Sending request to start invoice workflow...');
        const response = await request(app.getHttpServer())
          .post('/api/invoice/workflow/start')
          .send(workflowData)
          .expect(201);

        console.log('✅ Workflow start response received:', response.body);

        expect(response.body).toMatchObject({
          message: 'Invoice workflow started',
          taskId: expect.any(String),
        });

        console.log('🔍 Verifying task creation...');
        const task = await TestUtils.retryTaskRetrieval(
          taskService,
          response.body.taskId,
        );
        expect(task).toBeDefined();
        expect(task.type).toBe(TaskType.FETCH_ORDERS);
        expect(task.status).toBe(TaskStatus.PENDING);
        expect(task.payload.customerId).toBe(workflowData.customerId);
        expect(task.payload.dateFrom).toBe(workflowData.dateFrom);
        expect(task.payload.dateTo).toBe(workflowData.dateTo);

        console.log('✅ Task verification completed');
        console.log('📊 Task Details:', {
          id: task.id,
          type: task.type,
          status: task.status,
          customerId: task.payload.customerId,
        });
      });

      it('should handle workflow start with minimal required data', async () => {
        console.log('📋 Testing: Start Invoice Workflow with minimal data');

        const minimalData = TestDataGenerator.generateStartWorkflowData();

        console.log('📤 Sending request with minimal data...');
        const response = await request(app.getHttpServer())
          .post('/api/invoice/workflow/start')
          .send(minimalData)
          .expect(201);

        console.log('✅ Minimal data workflow response:', response.body);
        expect(response.body.taskId).toBeDefined();
        expect(response.body.message).toBe('Invoice workflow started');
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

        expect(response.body).toMatchObject({
          message: 'Scheduled invoice workflow created',
          taskId: expect.any(String),
          scheduledAt: scheduledData.scheduledAt,
        });

        console.log('🔍 Verifying scheduled task...');
        const task = await TestUtils.retryTaskRetrieval(
          taskService,
          response.body.taskId,
        );
        expect(task).toBeDefined();
        expect(task.type).toBe(TaskType.FETCH_ORDERS);
        expect(task.scheduledAt).toBeDefined();

        console.log('✅ Scheduled task verification completed');
        console.log('📊 Scheduled Task Details:', {
          id: task.id,
          type: task.type,
          scheduledAt: task.scheduledAt,
        });
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

        expect(response.body).toMatchObject({
          message: 'Recurring invoice workflow created',
          taskId: expect.any(String),
          cronExpression: recurringData.cronExpression,
        });

        console.log('🔍 Verifying recurring task...');
        const task = await TestUtils.retryTaskRetrieval(
          taskService,
          response.body.taskId,
        );
        expect(task).toBeDefined();
        expect(task.payload.cronExpression).toBe(recurringData.cronExpression);
        expect(task.payload.isRecurring).toBe(true);

        console.log('✅ Recurring task verification completed');
        console.log('📊 Recurring Task Details:', {
          id: task.id,
          cronExpression: task.payload.cronExpression,
          isRecurring: task.payload.isRecurring,
        });
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

        expect(response.body).toMatchObject({
          message: 'Scheduled email workflow created',
          taskId: expect.any(String),
          scheduledAt: expect.any(String),
        });

        console.log('🔍 Verifying email task...');
        const task = await TestUtils.retryTaskRetrieval(
          taskService,
          response.body.taskId,
        );
        expect(task).toBeDefined();
        expect(task.type).toBe(TaskType.SEND_EMAIL);
        expect(task.scheduledAt).toBeDefined();
        expect(task.payload.invoiceId).toBe(emailData.invoiceId);

        console.log('✅ Email task verification completed');
        console.log('📊 Email Task Details:', {
          id: task.id,
          type: task.type,
          invoiceId: task.payload.invoiceId,
          scheduledAt: task.scheduledAt,
        });
      });
    });
  });

  describe('Invoice Workflow Query Endpoints', () => {
    describe('GET /api/invoice/tasks/:customerId', () => {
      it('should return customer invoice tasks', async () => {
        console.log('📋 Testing: Get Customer Invoice Tasks');

        const customerId = 'customer-e2e-query-test';

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

        const customerId = 'customer-e2e-status-test';

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

        console.log('📊 Status Summary:', {
          total: response.body.totalTasks,
          completed: response.body.completedTasks,
          failed: response.body.failedTasks,
          pending: response.body.pendingTasks,
        });
      });

      it('should handle customer with no tasks', async () => {
        console.log('📋 Testing: Get Status for Customer with No Tasks');

        const customerId = 'customer-e2e-no-tasks';

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

    it('should handle task failures and create compensation tasks', async () => {
      console.log('📋 Testing: Task Failure and Compensation Logic');

      const customerId = 'customer-compensation-test';
      const workflowData = TestDataGenerator.generateStartWorkflowData();
      workflowData.customerId = customerId;

      console.log('📤 Starting workflow for compensation test...');
      const response = await request(app.getHttpServer())
        .post('/api/invoice/workflow/start')
        .send(workflowData)
        .expect(201);

      const taskId = response.body.taskId;
      console.log(`✅ Workflow started with task ID: ${taskId}`);

      console.log('🔍 Verifying initial task creation...');
      const initialTask = await TestUtils.retryTaskRetrieval(
        taskService,
        taskId,
      );
      expect(initialTask.status).toBe(TaskStatus.PENDING);
      expect(initialTask.type).toBe(TaskType.FETCH_ORDERS);

      console.log('💥 Simulating task failure...');
      await invoiceService.handleTaskFailure(
        taskId,
        new Error('Network timeout during order fetch'),
      );

      console.log('🔍 Verifying compensation task creation...');
      const allTasks = await taskService.findTasks();
      const compensationTask = allTasks.find(
        (t) =>
          t.type === TaskType.COMPENSATION &&
          t.payload.customerId === customerId,
      );

      expect(compensationTask).toBeDefined();
      expect(compensationTask!.payload.originalTaskId).toBe(taskId);
      expect(compensationTask!.payload.originalTaskType).toBe(
        TaskType.FETCH_ORDERS,
      );
      expect(compensationTask!.payload.reason).toBe(
        'Network timeout during order fetch',
      );

      console.log('📊 Compensation task details:', {
        id: compensationTask!.id,
        originalTaskId: compensationTask!.payload.originalTaskId,
        originalTaskType: compensationTask!.payload.originalTaskType,
        reason: compensationTask!.payload.reason,
        status: compensationTask!.status,
      });

      console.log('✅ Compensation logic test completed');
    });

    it('should handle multiple task failures in workflow chain', async () => {
      console.log('📋 Testing: Multiple Task Failures in Workflow Chain');

      const customerId = 'customer-multiple-failures-test';

      console.log('🔧 Creating workflow chain with failures...');
      const workflowChain =
        await workflowHelper.createCompleteWorkflowChain(customerId);

      console.log('💥 Simulating failures for different task types...');

      await invoiceService.handleTaskFailure(
        workflowChain.createInvoiceTask.id,
        new Error('Invoice creation service unavailable'),
      );

      await invoiceService.handleTaskFailure(
        workflowChain.generatePdfTask.id,
        new Error('PDF generation failed due to invalid data'),
      );

      console.log('🔍 Verifying compensation tasks for failed tasks...');
      const allTasks = await taskService.findTasks();
      const compensationTasks = allTasks.filter(
        (t) =>
          t.type === TaskType.COMPENSATION &&
          t.payload.customerId === customerId,
      );

      expect(compensationTasks).toHaveLength(2);

      const createInvoiceCompensation = compensationTasks.find(
        (t) => t.payload.originalTaskType === TaskType.CREATE_INVOICE,
      );
      const generatePdfCompensation = compensationTasks.find(
        (t) => t.payload.originalTaskType === TaskType.GENERATE_PDF,
      );

      expect(createInvoiceCompensation).toBeDefined();
      expect(generatePdfCompensation).toBeDefined();
      expect(createInvoiceCompensation!.payload.reason).toBe(
        'Invoice creation service unavailable',
      );
      expect(generatePdfCompensation!.payload.reason).toBe(
        'PDF generation failed due to invalid data',
      );

      console.log('📊 Multiple failures compensation summary:', {
        totalCompensationTasks: compensationTasks.length,
        createInvoiceCompensationId: createInvoiceCompensation!.id,
        generatePdfCompensationId: generatePdfCompensation!.id,
      });

      console.log('✅ Multiple failures test completed');
    });

    it('should handle retry mechanism for failed tasks', async () => {
      console.log('📋 Testing: Task Retry Mechanism');

      const customerId = 'customer-retry-test';
      const workflowData = TestDataGenerator.generateStartWorkflowData();
      workflowData.customerId = customerId;

      console.log('📤 Starting workflow for retry test...');
      const response = await request(app.getHttpServer())
        .post('/api/invoice/workflow/start')
        .send(workflowData)
        .expect(201);

      const taskId = response.body.taskId;
      console.log(`✅ Workflow started with task ID: ${taskId}`);

      console.log('🔄 Simulating first failure (should retry)...');
      await taskService.handleFailure(
        taskId,
        new Error('Temporary network issue'),
      );

      let updatedTask = await taskService.getTaskById(taskId);
      expect(updatedTask.retries).toBe(1);
      expect(updatedTask.status).toBe(TaskStatus.PENDING);

      console.log('🔄 Simulating second failure (should retry)...');
      await taskService.handleFailure(
        taskId,
        new Error('Service temporarily unavailable'),
      );

      updatedTask = await taskService.getTaskById(taskId);
      expect(updatedTask.retries).toBe(2);
      expect(updatedTask.status).toBe(TaskStatus.PENDING);

      console.log('🔄 Simulating third failure (should mark as failed)...');
      await taskService.handleFailure(
        taskId,
        new Error('Persistent failure after retries'),
      );

      updatedTask = await taskService.getTaskById(taskId);
      expect(updatedTask.retries).toBe(3);
      expect(updatedTask.status).toBe(TaskStatus.FAILED);

      console.log('📊 Retry mechanism summary:', {
        taskId,
        finalRetries: updatedTask.retries,
        finalStatus: updatedTask.status,
        maxRetries: 3,
      });

      console.log('✅ Retry mechanism test completed');
    });

    it('should handle workflow status with failed and compensation tasks', async () => {
      console.log('📋 Testing: Workflow Status with Failures and Compensation');

      const customerId = 'customer-status-failures-test';

      console.log('🔧 Creating workflow with failures...');
      const workflowChain =
        await workflowHelper.createCompleteWorkflowChain(customerId);

      console.log('💥 Simulating failures...');
      await invoiceService.handleTaskFailure(
        workflowChain.createInvoiceTask.id,
        new Error('Invoice creation failed'),
      );

      await invoiceService.handleTaskFailure(
        workflowChain.sendEmailTask.id,
        new Error('Email service unavailable'),
      );

      console.log('📤 Requesting workflow status...');
      const statusResponse = await request(app.getHttpServer())
        .get(`/api/invoice/status/${customerId}`)
        .expect(200);

      console.log('✅ Status response with failures:', statusResponse.body);

      expect(statusResponse.body).toMatchObject({
        customerId,
        totalTasks: expect.any(Number),
        failedTasks: 0,
        workflows: expect.any(Object),
      });

      const allTasks = await taskService.findTasks();
      const customerTasks = allTasks.filter(
        (t) => t.payload?.customerId === customerId,
      );
      const compensationTasks = customerTasks.filter(
        (t) => t.type === TaskType.COMPENSATION,
      );

      expect(compensationTasks).toHaveLength(2);
      expect(statusResponse.body.totalTasks).toBe(customerTasks.length);

      console.log('📊 Workflow status with failures:', {
        customerId,
        totalTasks: statusResponse.body.totalTasks,
        failedTasks: statusResponse.body.failedTasks,
        compensationTasks: compensationTasks.length,
        workflows: Object.keys(statusResponse.body.workflows).length,
      });

      console.log('✅ Workflow status with failures test completed');
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

  describe('Failure Scenarios and Compensation Logic', () => {
    it('should handle cascade failures in workflow chain', async () => {
      console.log('📋 Testing: Cascade Failures in Workflow Chain');

      const customerId = 'customer-cascade-failures-test';

      console.log('🔧 Creating workflow chain...');
      const workflowChain =
        await workflowHelper.createCompleteWorkflowChain(customerId);

      console.log('💥 Simulating cascade failures...');

      await invoiceService.handleTaskFailure(
        workflowChain.createInvoiceTask.id,
        new Error('Invoice creation service completely down'),
      );

      await invoiceService.handleTaskFailure(
        workflowChain.generatePdfTask.id,
        new Error('PDF service unavailable'),
      );

      await invoiceService.handleTaskFailure(
        workflowChain.sendEmailTask.id,
        new Error('Email service failure'),
      );

      console.log('🔍 Verifying compensation tasks for all failures...');
      const allTasks = await taskService.findTasks();
      const compensationTasks = allTasks.filter(
        (t) =>
          t.type === TaskType.COMPENSATION &&
          t.payload.customerId === customerId,
      );

      expect(compensationTasks).toHaveLength(3);

      const taskTypes = [
        TaskType.CREATE_INVOICE,
        TaskType.GENERATE_PDF,
        TaskType.SEND_EMAIL,
      ];
      for (const taskType of taskTypes) {
        const compensation = compensationTasks.find(
          (t) => t.payload.originalTaskType === taskType,
        );
        expect(compensation).toBeDefined();
        expect(compensation!.payload.customerId).toBe(customerId);
      }

      console.log('📊 Cascade failures summary:', {
        totalCompensationTasks: compensationTasks.length,
        failedTaskTypes: taskTypes,
        customerId,
      });

      console.log('✅ Cascade failures test completed');
    });

    it('should handle partial workflow completion with failures', async () => {
      console.log('📋 Testing: Partial Workflow Completion with Failures');

      const customerId = 'customer-partial-completion-test';

      console.log('🔧 Creating workflow chain...');
      const workflowChain =
        await workflowHelper.createCompleteWorkflowChain(customerId);

      console.log('✅ Simulating partial success and partial failure...');

      await taskService.updateTaskStatus(
        workflowChain.fetchOrdersTask.id,
        TaskStatus.COMPLETED,
      );
      await taskService.updateTaskStatus(
        workflowChain.createInvoiceTask.id,
        TaskStatus.COMPLETED,
      );

      await invoiceService.handleTaskFailure(
        workflowChain.generatePdfTask.id,
        new Error('PDF generation failed'),
      );

      const sendEmailTask = await taskService.getTaskById(
        workflowChain.sendEmailTask.id,
      );
      expect(sendEmailTask.status).toBe(TaskStatus.PENDING);

      console.log('📤 Requesting workflow status...');
      const statusResponse = await request(app.getHttpServer())
        .get(`/api/invoice/status/${customerId}`)
        .expect(200);

      expect(statusResponse.body).toMatchObject({
        customerId,
        completedTasks: 3,
        failedTasks: 0,
        pendingTasks: 2,
        processingTasks: 0,
      });

      console.log('📊 Partial completion summary:', {
        customerId,
        completedTasks: statusResponse.body.completedTasks,
        failedTasks: statusResponse.body.failedTasks,
        pendingTasks: statusResponse.body.pendingTasks,
        totalTasks: statusResponse.body.totalTasks,
      });

      console.log('✅ Partial completion test completed');
    });

    it('should handle compensation task execution and status tracking', async () => {
      console.log(
        '📋 Testing: Compensation Task Execution and Status Tracking',
      );

      const customerId = 'customer-compensation-execution-test';
      const workflowData = TestDataGenerator.generateStartWorkflowData();
      workflowData.customerId = customerId;

      console.log('📤 Starting workflow...');
      const response = await request(app.getHttpServer())
        .post('/api/invoice/workflow/start')
        .send(workflowData)
        .expect(201);

      const taskId = response.body.taskId;

      console.log('💥 Simulating task failure...');
      await invoiceService.handleTaskFailure(
        taskId,
        new Error('Critical system failure'),
      );

      console.log('🔍 Verifying compensation task creation and status...');
      const allTasks = await taskService.findTasks();
      const compensationTask = allTasks.find(
        (t) =>
          t.type === TaskType.COMPENSATION &&
          t.payload.customerId === customerId,
      );

      expect(compensationTask).toBeDefined();
      expect(compensationTask!.status).toBe(TaskStatus.PENDING);

      console.log('🔄 Simulating compensation task processing...');
      await taskService.updateTaskStatus(
        compensationTask!.id,
        TaskStatus.PROCESSING,
      );

      let updatedCompensationTask = await taskService.getTaskById(
        compensationTask!.id,
      );
      expect(updatedCompensationTask.status).toBe(TaskStatus.PROCESSING);

      console.log('✅ Simulating compensation task completion...');
      await taskService.updateTaskStatus(
        compensationTask!.id,
        TaskStatus.COMPLETED,
      );

      updatedCompensationTask = await taskService.getTaskById(
        compensationTask!.id,
      );
      expect(updatedCompensationTask.status).toBe(TaskStatus.COMPLETED);

      console.log('📤 Requesting final workflow status...');
      const statusResponse = await request(app.getHttpServer())
        .get(`/api/invoice/status/${customerId}`)
        .expect(200);

      expect(statusResponse.body).toMatchObject({
        customerId,
        totalTasks: 3,
        failedTasks: 0,
        completedTasks: 1,
        pendingTasks: 2,
        processingTasks: 0,
      });

      console.log('📊 Compensation execution summary:', {
        customerId,
        originalTaskId: taskId,
        compensationTaskId: compensationTask!.id,
        originalTaskStatus: 'FAILED',
        compensationTaskStatus: 'COMPLETED',
        totalTasks: statusResponse.body.totalTasks,
      });

      console.log('✅ Compensation execution test completed');
    });

    it('should handle multiple compensation tasks for same customer', async () => {
      console.log('📋 Testing: Multiple Compensation Tasks for Same Customer');

      const customerId = 'customer-multiple-compensation-test';

      console.log('🔧 Creating multiple workflows for same customer...');

      const workflow1Data = TestDataGenerator.generateStartWorkflowData();
      workflow1Data.customerId = customerId;
      const response1 = await request(app.getHttpServer())
        .post('/api/invoice/workflow/start')
        .send(workflow1Data)
        .expect(201);

      const workflow2Data = TestDataGenerator.generateStartWorkflowData();
      workflow2Data.customerId = customerId;
      const response2 = await request(app.getHttpServer())
        .post('/api/invoice/workflow/start')
        .send(workflow2Data)
        .expect(201);

      console.log('💥 Simulating failures for both workflows...');
      await invoiceService.handleTaskFailure(
        response1.body.taskId,
        new Error('First workflow failure'),
      );

      await invoiceService.handleTaskFailure(
        response2.body.taskId,
        new Error('Second workflow failure'),
      );

      console.log('🔍 Verifying multiple compensation tasks...');
      const allTasks = await taskService.findTasks();
      const compensationTasks = allTasks.filter(
        (t) =>
          t.type === TaskType.COMPENSATION &&
          t.payload.customerId === customerId,
      );

      expect(compensationTasks).toHaveLength(2);

      const originalTaskIds = compensationTasks.map(
        (t) => t.payload.originalTaskId,
      );
      expect(originalTaskIds).toContain(response1.body.taskId);
      expect(originalTaskIds).toContain(response2.body.taskId);

      console.log('📤 Requesting customer status...');
      const statusResponse = await request(app.getHttpServer())
        .get(`/api/invoice/status/${customerId}`)
        .expect(200);

      expect(statusResponse.body).toMatchObject({
        customerId,
        totalTasks: 6,
        failedTasks: 0,
        pendingTasks: 6,
      });

      console.log('📊 Multiple compensation summary:', {
        customerId,
        totalTasks: statusResponse.body.totalTasks,
        failedTasks: statusResponse.body.failedTasks,
        compensationTasks: compensationTasks.length,
        originalTaskIds,
        compensationTaskIds: compensationTasks.map((t) => t.id),
      });

      console.log('✅ Multiple compensation tasks test completed');
    });
  });
});
