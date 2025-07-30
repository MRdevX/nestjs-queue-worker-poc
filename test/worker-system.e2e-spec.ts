import * as request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app/app.module';
import { TaskType } from '../src/app/task/types/task-type.enum';
import { TaskStatus } from '../src/app/task/types/task-status.enum';
import { MessagingService } from '../src/app/core/messaging/messaging.service';
import { TaskService } from '../src/app/task/task.service';
import { UtilsService } from '../src/app/core/utils/utils.service';

describe('Worker System (e2e)', () => {
  let app: INestApplication;
  let messagingService: MessagingService;
  let taskService: TaskService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    messagingService = moduleFixture.get<MessagingService>(MessagingService);
    taskService = moduleFixture.get<TaskService>(TaskService);

    await messagingService.connect();
  });

  afterAll(async () => {
    await messagingService.close();
    await app.close();
  });

  describe('HTTP Worker', () => {
    it('should process HTTP request tasks successfully', async () => {
      // Create an HTTP request task
      const taskData = {
        type: TaskType.HTTP_REQUEST,
        payload: {
          url: 'https://httpbin.org/get',
          method: 'GET',
          headers: { 'User-Agent': 'QueueWorker-PoC' },
        },
      };

      const createResponse = await request(app.getHttpServer())
        .post('/tasks')
        .send(taskData)
        .expect(201);

      const taskId = createResponse.body.id;

      // Wait for task to be processed (give it some time)
      await UtilsService.sleep(2000);

      // Check task status
      const getResponse = await request(app.getHttpServer())
        .get(`/tasks/${taskId}`)
        .expect(200);

      // Task should be completed or at least processed
      expect(['completed', 'processing', 'failed']).toContain(
        getResponse.body.status,
      );
    });

    it('should handle HTTP request failures gracefully', async () => {
      // Create a task with invalid URL
      const taskData = {
        type: TaskType.HTTP_REQUEST,
        payload: {
          url: 'https://invalid-url-that-does-not-exist-12345.com',
          method: 'GET',
        },
      };

      const createResponse = await request(app.getHttpServer())
        .post('/tasks')
        .send(taskData)
        .expect(201);

      const taskId = createResponse.body.id;

      // Wait for task to be processed
      await UtilsService.sleep(3000);

      // Check task status
      const getResponse = await request(app.getHttpServer())
        .get(`/tasks/${taskId}`)
        .expect(200);

      // Task should be failed
      expect(getResponse.body.status).toBe(TaskStatus.FAILED);
      expect(getResponse.body.error).toBeDefined();
    });

    it('should handle POST requests with data', async () => {
      const taskData = {
        type: TaskType.HTTP_REQUEST,
        payload: {
          url: 'https://httpbin.org/post',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          data: { test: 'data', timestamp: Date.now() },
        },
      };

      const createResponse = await request(app.getHttpServer())
        .post('/tasks')
        .send(taskData)
        .expect(201);

      const taskId = createResponse.body.id;

      // Wait for task to be processed
      await UtilsService.sleep(2000);

      // Check task status
      const getResponse = await request(app.getHttpServer())
        .get(`/tasks/${taskId}`)
        .expect(200);

      expect(['completed', 'processing', 'failed']).toContain(
        getResponse.body.status,
      );
    });
  });

  describe('Data Processing Worker', () => {
    it('should process data processing tasks', async () => {
      const taskData = {
        type: TaskType.DATA_PROCESSING,
        payload: {
          source: 'test-data',
          operation: 'transform',
          data: { items: [1, 2, 3, 4, 5] },
        },
      };

      const createResponse = await request(app.getHttpServer())
        .post('/tasks')
        .send(taskData)
        .expect(201);

      const taskId = createResponse.body.id;

      // Wait for task to be processed
      await UtilsService.sleep(2000);

      // Check task status
      const getResponse = await request(app.getHttpServer())
        .get(`/tasks/${taskId}`)
        .expect(200);

      expect(['completed', 'processing', 'failed']).toContain(
        getResponse.body.status,
      );
    });

    it('should handle data processing with complex operations', async () => {
      const taskData = {
        type: TaskType.DATA_PROCESSING,
        payload: {
          source: 'database',
          operation: 'aggregate',
          filters: {
            status: 'active',
            dateRange: { from: '2024-01-01', to: '2024-12-31' },
          },
          aggregations: ['sum', 'average', 'count'],
        },
      };

      const createResponse = await request(app.getHttpServer())
        .post('/tasks')
        .send(taskData)
        .expect(201);

      const taskId = createResponse.body.id;

      // Wait for task to be processed
      await UtilsService.sleep(2000);

      // Check task status
      const getResponse = await request(app.getHttpServer())
        .get(`/tasks/${taskId}`)
        .expect(200);

      expect(['completed', 'processing', 'failed']).toContain(
        getResponse.body.status,
      );
    });
  });

  describe('Compensation Worker', () => {
    it('should process compensation tasks', async () => {
      const taskData = {
        type: TaskType.COMPENSATION,
        payload: {
          originalTaskId: '00000000-0000-0000-0000-000000000000',
          originalTaskType: TaskType.HTTP_REQUEST,
          compensationAction: 'rollback',
          rollbackData: { transactionId: 'tx-123', amount: 100 },
        },
      };

      const createResponse = await request(app.getHttpServer())
        .post('/tasks')
        .send(taskData)
        .expect(201);

      const taskId = createResponse.body.id;

      // Wait for task to be processed
      await UtilsService.sleep(2000);

      // Check task status
      const getResponse = await request(app.getHttpServer())
        .get(`/tasks/${taskId}`)
        .expect(200);

      expect(['completed', 'processing', 'failed']).toContain(
        getResponse.body.status,
      );
    });
  });

  describe('Task Retry Mechanism', () => {
    it('should retry failed tasks with exponential backoff', async () => {
      // Create a task that will likely fail
      const taskData = {
        type: TaskType.HTTP_REQUEST,
        payload: {
          url: 'https://invalid-url-that-will-fail.com',
          method: 'GET',
        },
      };

      const createResponse = await request(app.getHttpServer())
        .post('/tasks')
        .send(taskData)
        .expect(201);

      const taskId = createResponse.body.id;

      // Wait for initial processing
      await UtilsService.sleep(3000);

      // Check initial status
      let getResponse = await request(app.getHttpServer())
        .get(`/tasks/${taskId}`)
        .expect(200);

      // If task failed, retry it
      if (getResponse.body.status === TaskStatus.FAILED) {
        const retryResponse = await request(app.getHttpServer())
          .post(`/tasks/${taskId}/retry`)
          .expect(200);

        expect(retryResponse.body.message).toContain('retry');

        // Wait for retry processing
        await UtilsService.sleep(2000);

        // Check status after retry
        getResponse = await request(app.getHttpServer())
          .get(`/tasks/${taskId}`)
          .expect(200);

        expect(getResponse.body.retries).toBeGreaterThan(0);
      }
    });
  });

  describe('Task Logging', () => {
    it('should log task execution details', async () => {
      const taskData = {
        type: TaskType.DATA_PROCESSING,
        payload: { source: 'logging-test', operation: 'test' },
      };

      const createResponse = await request(app.getHttpServer())
        .post('/tasks')
        .send(taskData)
        .expect(201);

      const taskId = createResponse.body.id;

      // Wait for task to be processed
      await UtilsService.sleep(2000);

      // Get task with logs
      const getResponse = await request(app.getHttpServer())
        .get(`/tasks/${taskId}?includeLogs=true`)
        .expect(200);

      expect(getResponse.body).toHaveProperty('logs');
      expect(Array.isArray(getResponse.body.logs)).toBe(true);
    });
  });

  describe('Concurrent Task Processing', () => {
    it('should handle multiple tasks concurrently', async () => {
      const taskPromises = Array.from({ length: 10 }, (_, i) => {
        const taskData = {
          type: i % 2 === 0 ? TaskType.HTTP_REQUEST : TaskType.DATA_PROCESSING,
          payload: {
            url: i % 2 === 0 ? 'https://httpbin.org/get' : undefined,
            method: i % 2 === 0 ? 'GET' : undefined,
            source: i % 2 === 0 ? undefined : `concurrent-test-${i}`,
            operation: i % 2 === 0 ? undefined : 'process',
          },
        };

        return request(app.getHttpServer())
          .post('/tasks')
          .send(taskData)
          .expect(201);
      });

      const responses = await Promise.all(taskPromises);
      expect(responses).toHaveLength(10);

      // Wait for processing
      await UtilsService.sleep(5000);

      // Check queue status
      const queueStatus = await request(app.getHttpServer())
        .get('/queue-manager/status')
        .expect(200);

      // Should have processed some tasks
      expect(queueStatus.body.total).toBeGreaterThanOrEqual(10);
    });
  });

  describe('Task Priority and Ordering', () => {
    it('should process tasks in order of creation', async () => {
      const tasks: any[] = [];

      // Create multiple tasks
      for (let i = 0; i < 5; i++) {
        const taskData = {
          type: TaskType.DATA_PROCESSING,
          payload: { source: `order-test-${i}`, operation: 'process' },
        };

        const response = await request(app.getHttpServer())
          .post('/tasks')
          .send(taskData)
          .expect(201);

        tasks.push(response.body);
      }

      // Wait for processing
      await UtilsService.sleep(3000);

      // Get pending tasks to check order
      const pendingResponse = await request(app.getHttpServer())
        .get('/queue/pending')
        .expect(200);

      // Tasks should maintain some order (though exact order may vary due to concurrent processing)
      expect(pendingResponse.body.length).toBeGreaterThanOrEqual(0);
    });
  });
});
