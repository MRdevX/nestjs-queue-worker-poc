import * as request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app/app.module';
import { TaskType } from '../src/app/task/types/task-type.enum';
import { TaskStatus } from '../src/app/task/types/task-status.enum';
import { MessagingService } from '../src/app/core/messaging/messaging.service';
import { UtilsService } from '../src/app/core/utils/utils.service';

describe('Fault Tolerance and Compensation (e2e)', () => {
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

  describe('Retry Mechanisms', () => {
    it('should retry failed tasks with exponential backoff', async () => {
      // Create a task that will fail
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

      // Task should be failed
      expect(getResponse.body.status).toBe(TaskStatus.FAILED);
      expect(getResponse.body.retries).toBe(0);

      // Retry the task
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
    });

    it('should respect maximum retry limits', async () => {
      // Create a task that will consistently fail
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

      // Retry multiple times
      for (let i = 0; i < 5; i++) {
        await UtilsService.sleep(2000);

        const retryResponse = await request(app.getHttpServer())
          .post(`/tasks/${taskId}/retry`)
          .expect(200);

        expect(retryResponse.body.message).toContain('retry');
      }

      // Wait for final processing
      await UtilsService.sleep(2000);

      // Check final status
      const getResponse = await request(app.getHttpServer())
        .get(`/tasks/${taskId}`)
        .expect(200);

      // Should not exceed max retries (default is 3)
      expect(getResponse.body.retries).toBeLessThanOrEqual(3);
    });

    it('should handle retry with different task types', async () => {
      // Test retry with data processing task
      const taskData = {
        type: TaskType.DATA_PROCESSING,
        payload: { source: 'invalid-source', operation: 'process' },
      };

      const createResponse = await request(app.getHttpServer())
        .post('/tasks')
        .send(taskData)
        .expect(201);

      const taskId = createResponse.body.id;

      // Wait for initial processing
      await UtilsService.sleep(3000);

      // Retry the task
      const retryResponse = await request(app.getHttpServer())
        .post(`/tasks/${taskId}/retry`)
        .expect(200);

      expect(retryResponse.body.message).toContain('retry');
    });
  });

  describe('Compensation Mechanisms', () => {
    it('should create compensation tasks for failed tasks', async () => {
      // Create a task that will fail
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

      // Trigger compensation
      const compensationResponse = await request(app.getHttpServer())
        .post(`/tasks/${taskId}/compensate`)
        .expect(200);

      expect(compensationResponse.body.message).toContain('compensation');

      // Wait for compensation processing
      await UtilsService.sleep(2000);

      // Check if compensation task was created
      const getResponse = await request(app.getHttpServer())
        .get(`/tasks/${taskId}`)
        .expect(200);

      // Original task should still exist
      expect(getResponse.body.id).toBe(taskId);
    });

    it('should handle compensation for different task types', async () => {
      // Test compensation for data processing task
      const taskData = {
        type: TaskType.DATA_PROCESSING,
        payload: { source: 'test-source', operation: 'process' },
      };

      const createResponse = await request(app.getHttpServer())
        .post('/tasks')
        .send(taskData)
        .expect(201);

      const taskId = createResponse.body.id;

      // Trigger compensation immediately
      const compensationResponse = await request(app.getHttpServer())
        .post(`/tasks/${taskId}/compensate`)
        .expect(200);

      expect(compensationResponse.body.message).toContain('compensation');
    });

    it('should handle compensation task execution', async () => {
      // Create a compensation task directly
      const compensationTaskData = {
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
        .send(compensationTaskData)
        .expect(201);

      const taskId = createResponse.body.id;

      // Wait for compensation task processing
      await UtilsService.sleep(2000);

      // Check compensation task status
      const getResponse = await request(app.getHttpServer())
        .get(`/tasks/${taskId}`)
        .expect(200);

      expect(['completed', 'processing', 'failed']).toContain(
        getResponse.body.status,
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle network timeouts gracefully', async () => {
      // Create a task with a URL that will timeout
      const taskData = {
        type: TaskType.HTTP_REQUEST,
        payload: {
          url: 'https://httpbin.org/delay/10', // 10 second delay
          method: 'GET',
          timeout: 2000, // 2 second timeout
        },
      };

      const createResponse = await request(app.getHttpServer())
        .post('/tasks')
        .send(taskData)
        .expect(201);

      const taskId = createResponse.body.id;

      // Wait for timeout
      await UtilsService.sleep(5000);

      // Check task status
      const getResponse = await request(app.getHttpServer())
        .get(`/tasks/${taskId}`)
        .expect(200);

      // Task should be failed due to timeout
      expect(getResponse.body.status).toBe(TaskStatus.FAILED);
      expect(getResponse.body.error).toBeDefined();
    });

    it('should handle malformed payloads', async () => {
      // Create a task with malformed payload
      const taskData = {
        type: TaskType.HTTP_REQUEST,
        payload: {
          url: 'not-a-valid-url',
          method: 'INVALID_METHOD',
        },
      };

      const createResponse = await request(app.getHttpServer())
        .post('/tasks')
        .send(taskData)
        .expect(201);

      const taskId = createResponse.body.id;

      // Wait for processing
      await UtilsService.sleep(3000);

      // Check task status
      const getResponse = await request(app.getHttpServer())
        .get(`/tasks/${taskId}`)
        .expect(200);

      // Task should be failed
      expect(getResponse.body.status).toBe(TaskStatus.FAILED);
      expect(getResponse.body.error).toBeDefined();
    });

    it('should handle service unavailability', async () => {
      // Create a task that tries to reach an unavailable service
      const taskData = {
        type: TaskType.HTTP_REQUEST,
        payload: {
          url: 'https://httpbin.org/status/503', // Service unavailable
          method: 'GET',
        },
      };

      const createResponse = await request(app.getHttpServer())
        .post('/tasks')
        .send(taskData)
        .expect(201);

      const taskId = createResponse.body.id;

      // Wait for processing
      await UtilsService.sleep(3000);

      // Check task status
      const getResponse = await request(app.getHttpServer())
        .get(`/tasks/${taskId}`)
        .expect(200);

      // Task should be failed due to 503 response
      expect(getResponse.body.status).toBe(TaskStatus.FAILED);
    });
  });

  describe('Recovery Mechanisms', () => {
    it('should recover from temporary failures', async () => {
      // Create a task that might succeed on retry
      const taskData = {
        type: TaskType.HTTP_REQUEST,
        payload: {
          url: 'https://httpbin.org/status/500', // Server error
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

    it('should handle partial failures in workflow', async () => {
      // Create multiple related tasks
      const tasks: any[] = [];

      for (let i = 0; i < 3; i++) {
        const taskData = {
          type: i === 1 ? TaskType.HTTP_REQUEST : TaskType.DATA_PROCESSING,
          payload:
            i === 1
              ? { url: 'https://httpbin.org/status/500', method: 'GET' } // This will fail
              : { source: `task-${i}`, operation: 'process' },
        };

        const response = await request(app.getHttpServer())
          .post('/tasks')
          .send(taskData)
          .expect(201);

        tasks.push(response.body);
      }

      // Wait for processing
      await UtilsService.sleep(4000);

      // Check status of all tasks
      for (const task of tasks) {
        const getResponse = await request(app.getHttpServer())
          .get(`/tasks/${task.id}`)
          .expect(200);

        // At least one task should be failed
        if (getResponse.body.status === TaskStatus.FAILED) {
          // Trigger compensation for failed task
          const compensationResponse = await request(app.getHttpServer())
            .post(`/tasks/${task.id}/compensate`)
            .expect(200);

          expect(compensationResponse.body.message).toContain('compensation');
          break;
        }
      }
    });
  });

  describe('Monitoring and Alerting', () => {
    it('should track failed tasks for monitoring', async () => {
      // Create multiple tasks that will fail
      const failedTasks: any[] = [];

      for (let i = 0; i < 3; i++) {
        const taskData = {
          type: TaskType.HTTP_REQUEST,
          payload: {
            url: 'https://invalid-url-that-will-fail.com',
            method: 'GET',
          },
        };

        const response = await request(app.getHttpServer())
          .post('/tasks')
          .send(taskData)
          .expect(201);

        failedTasks.push(response.body);
      }

      // Wait for processing
      await UtilsService.sleep(4000);

      // Check failed tasks count
      const failedCountResponse = await request(app.getHttpServer())
        .get('/queue-manager/failed-count')
        .expect(200);

      expect(failedCountResponse.body.failedTasks).toBeGreaterThanOrEqual(3);

      // Check queue status
      const queueStatusResponse = await request(app.getHttpServer())
        .get('/queue-manager/status')
        .expect(200);

      expect(queueStatusResponse.body.failed).toBeGreaterThanOrEqual(3);
      expect(queueStatusResponse.body.isHealthy).toBe(false);
    });

    it('should detect overloaded queues', async () => {
      // Create many tasks to overload the queue
      const taskPromises = Array.from({ length: 10 }, (_, i) => {
        const taskData = {
          type: TaskType.DATA_PROCESSING,
          payload: { source: `overload-test-${i}`, operation: 'process' },
        };

        return request(app.getHttpServer())
          .post('/tasks')
          .send(taskData)
          .expect(201);
      });

      await Promise.all(taskPromises);

      // Check if queue is overloaded
      const overloadedResponse = await request(app.getHttpServer())
        .get('/queue-manager/overloaded')
        .expect(200);

      // Queue might be overloaded due to high number of tasks
      expect(overloadedResponse.body).toHaveProperty('isOverloaded');
      expect(overloadedResponse.body).toHaveProperty('message');
    });
  });
});
