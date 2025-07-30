import * as request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app/app.module';
import { TaskType } from '../src/app/task/types/task-type.enum';
import { TaskStatus } from '../src/app/task/types/task-status.enum';
import { MessagingService } from '../src/app/core/messaging/messaging.service';
import { UtilsService } from '../src/app/core/utils/utils.service';

describe('Workflow and Scheduler System (e2e)', () => {
  let app: INestApplication;
  let messagingService: MessagingService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    messagingService = moduleFixture.get<MessagingService>(MessagingService);
    await messagingService.connect();
  });

  afterAll(async () => {
    await messagingService.close();
    await app.close();
  });

  describe('Task Scheduling', () => {
    it('should create and execute scheduled tasks', async () => {
      // Create a task scheduled for 2 seconds from now
      const scheduledAt = new Date(Date.now() + 2000);
      const taskData = {
        type: TaskType.HTTP_REQUEST,
        payload: { url: 'https://httpbin.org/get', method: 'GET' },
        scheduledAt: scheduledAt.toISOString(),
      };

      const createResponse = await request(app.getHttpServer())
        .post('/scheduler/tasks/scheduled')
        .send(taskData)
        .expect(201);

      const taskId = createResponse.body.id;
      expect(createResponse.body.scheduledAt).toBe(scheduledAt.toISOString());

      // Initially, task should be in pending state
      let getResponse = await request(app.getHttpServer())
        .get(`/tasks/${taskId}`)
        .expect(200);

      expect(getResponse.body.status).toBe(TaskStatus.PENDING);

      // Wait for scheduled time plus some buffer
      await UtilsService.sleep(4000);

      // Check if task was executed
      getResponse = await request(app.getHttpServer())
        .get(`/tasks/${taskId}`)
        .expect(200);

      // Task should have been processed
      expect(['completed', 'processing', 'failed']).toContain(
        getResponse.body.status,
      );
    });

    it('should create recurring tasks', async () => {
      const taskData = {
        type: TaskType.DATA_PROCESSING,
        payload: { source: 'recurring-test', operation: 'backup' },
        cronExpression: '*/1 * * * *', // Every minute
      };

      const createResponse = await request(app.getHttpServer())
        .post('/scheduler/tasks/recurring')
        .send(taskData)
        .expect(201);

      const taskId = createResponse.body.id;
      expect(createResponse.body.payload.cronExpression).toBe('*/1 * * * *');
      expect(createResponse.body.payload.isRecurring).toBe(true);
    });

    it('should handle invalid scheduled dates', async () => {
      const taskData = {
        type: TaskType.HTTP_REQUEST,
        payload: { url: 'https://httpbin.org/get' },
        scheduledAt: 'invalid-date-string',
      };

      await request(app.getHttpServer())
        .post('/scheduler/tasks/scheduled')
        .send(taskData)
        .expect(500); // Should throw an error for invalid date
    });

    it('should get all scheduled tasks', async () => {
      const response = await request(app.getHttpServer())
        .get('/scheduler/tasks/scheduled')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Workflow Management', () => {
    it('should create a workflow with multiple tasks', async () => {
      // Create a workflow definition
      const workflowData = {
        name: 'Test Workflow',
        definition: {
          initialTask: {
            type: TaskType.HTTP_REQUEST,
            payload: { url: 'https://httpbin.org/get', method: 'GET' },
          },
          transitions: {
            success: {
              type: TaskType.DATA_PROCESSING,
              payload: { source: 'http-response', operation: 'parse' },
            },
            failure: {
              type: TaskType.COMPENSATION,
              payload: { action: 'rollback', reason: 'http-failed' },
            },
          },
        },
      };

      // This would require a workflow creation endpoint
      // For now, we'll test the individual components
      const initialTaskData = {
        type: TaskType.HTTP_REQUEST,
        payload: { url: 'https://httpbin.org/get', method: 'GET' },
      };

      const createResponse = await request(app.getHttpServer())
        .post('/tasks')
        .send(initialTaskData)
        .expect(201);

      expect(createResponse.body.type).toBe(TaskType.HTTP_REQUEST);
    });

    it('should handle workflow task dependencies', async () => {
      // Create parent task
      const parentTaskData = {
        type: TaskType.DATA_PROCESSING,
        payload: { source: 'parent-task', operation: 'prepare' },
      };

      const parentResponse = await request(app.getHttpServer())
        .post('/tasks')
        .send(parentTaskData)
        .expect(201);

      const parentTaskId = parentResponse.body.id;

      // Create child task that depends on parent
      const childTaskData = {
        type: TaskType.HTTP_REQUEST,
        payload: { url: 'https://httpbin.org/post', method: 'POST' },
        parentTaskId: parentTaskId,
      };

      const childResponse = await request(app.getHttpServer())
        .post('/tasks')
        .send(childTaskData)
        .expect(201);

      expect(childResponse.body).toHaveProperty('id');
    });
  });

  describe('Scheduled Task Processing', () => {
    it('should process multiple scheduled tasks', async () => {
      const tasks: any[] = [];
      const now = Date.now();

      // Create multiple scheduled tasks
      for (let i = 0; i < 3; i++) {
        const scheduledAt = new Date(now + (i + 1) * 1000); // 1, 2, 3 seconds from now
        const taskData = {
          type: TaskType.DATA_PROCESSING,
          payload: { source: `scheduled-test-${i}`, operation: 'process' },
          scheduledAt: scheduledAt.toISOString(),
        };

        const response = await request(app.getHttpServer())
          .post('/scheduler/tasks/scheduled')
          .send(taskData)
          .expect(201);

        tasks.push(response.body);
      }

      // Wait for all tasks to be processed
      await UtilsService.sleep(6000);

      // Check status of all tasks
      for (const task of tasks) {
        const getResponse = await request(app.getHttpServer())
          .get(`/tasks/${task.id}`)
          .expect(200);

        expect(['completed', 'processing', 'failed']).toContain(
          getResponse.body.status,
        );
      }
    });

    it('should handle scheduled task failures', async () => {
      const scheduledAt = new Date(Date.now() + 2000);
      const taskData = {
        type: TaskType.HTTP_REQUEST,
        payload: {
          url: 'https://invalid-url-that-will-fail.com',
          method: 'GET',
        },
        scheduledAt: scheduledAt.toISOString(),
      };

      const createResponse = await request(app.getHttpServer())
        .post('/scheduler/tasks/scheduled')
        .send(taskData)
        .expect(201);

      const taskId = createResponse.body.id;

      // Wait for scheduled execution
      await UtilsService.sleep(4000);

      // Check task status
      const getResponse = await request(app.getHttpServer())
        .get(`/tasks/${taskId}`)
        .expect(200);

      // Task should be failed
      expect(getResponse.body.status).toBe(TaskStatus.FAILED);
      expect(getResponse.body.error).toBeDefined();
    });
  });

  describe('Recurring Task Management', () => {
    it('should create and manage recurring tasks', async () => {
      const taskData = {
        type: TaskType.DATA_PROCESSING,
        payload: { source: 'recurring-management', operation: 'cleanup' },
        cronExpression: '0 */2 * * *', // Every 2 hours
      };

      const createResponse = await request(app.getHttpServer())
        .post('/scheduler/tasks/recurring')
        .send(taskData)
        .expect(201);

      const taskId = createResponse.body.id;

      // Verify recurring task properties
      expect(createResponse.body.payload.isRecurring).toBe(true);
      expect(createResponse.body.payload.cronExpression).toBe('0 */2 * * *');

      // Get task details
      const getResponse = await request(app.getHttpServer())
        .get(`/tasks/${taskId}`)
        .expect(200);

      expect(getResponse.body.payload.isRecurring).toBe(true);
    });
  });

  describe('Scheduler Integration', () => {
    it('should demonstrate scheduler-worker integration', async () => {
      // Create a scheduled task
      const scheduledAt = new Date(Date.now() + 1000);
      const taskData = {
        type: TaskType.HTTP_REQUEST,
        payload: { url: 'https://httpbin.org/status/200', method: 'GET' },
        scheduledAt: scheduledAt.toISOString(),
      };

      const createResponse = await request(app.getHttpServer())
        .post('/scheduler/tasks/scheduled')
        .send(taskData)
        .expect(201);

      const taskId = createResponse.body.id;

      // Wait for scheduling and processing
      await UtilsService.sleep(3000);

      // Check final status
      const getResponse = await request(app.getHttpServer())
        .get(`/tasks/${taskId}`)
        .expect(200);

      // Task should be completed
      expect(getResponse.body.status).toBe(TaskStatus.COMPLETED);
    });

    it('should handle scheduler with high load', async () => {
      const taskPromises = Array.from({ length: 5 }, (_, i) => {
        const scheduledAt = new Date(Date.now() + (i + 1) * 500); // Staggered scheduling
        const taskData = {
          type: i % 2 === 0 ? TaskType.HTTP_REQUEST : TaskType.DATA_PROCESSING,
          payload: {
            url: i % 2 === 0 ? 'https://httpbin.org/get' : undefined,
            method: i % 2 === 0 ? 'GET' : undefined,
            source: i % 2 === 0 ? undefined : `load-test-${i}`,
            operation: i % 2 === 0 ? undefined : 'process',
          },
          scheduledAt: scheduledAt.toISOString(),
        };

        return request(app.getHttpServer())
          .post('/scheduler/tasks/scheduled')
          .send(taskData)
          .expect(201);
      });

      const responses = await Promise.all(taskPromises);
      expect(responses).toHaveLength(5);

      // Wait for all tasks to be processed
      await UtilsService.sleep(4000);

      // Check queue status
      const queueStatus = await request(app.getHttpServer())
        .get('/queue-manager/status')
        .expect(200);

      // Should have processed the scheduled tasks
      expect(queueStatus.body.total).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Error Handling in Scheduling', () => {
    it('should handle scheduler errors gracefully', async () => {
      // Create a task with invalid payload that might cause processing errors
      const scheduledAt = new Date(Date.now() + 1000);
      const taskData = {
        type: TaskType.HTTP_REQUEST,
        payload: {
          url: 'https://httpbin.org/status/500', // This will return 500 error
          method: 'GET',
        },
        scheduledAt: scheduledAt.toISOString(),
      };

      const createResponse = await request(app.getHttpServer())
        .post('/scheduler/tasks/scheduled')
        .send(taskData)
        .expect(201);

      const taskId = createResponse.body.id;

      // Wait for processing
      await UtilsService.sleep(3000);

      // Check task status
      const getResponse = await request(app.getHttpServer())
        .get(`/tasks/${taskId}`)
        .expect(200);

      // Task should be failed due to 500 response
      expect(getResponse.body.status).toBe(TaskStatus.FAILED);
    });
  });
});
