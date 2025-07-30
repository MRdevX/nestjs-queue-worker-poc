import * as request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app/app.module';
import { TaskType } from '../src/app/task/types/task-type.enum';
import { TaskStatus } from '../src/app/task/types/task-status.enum';
import { MessagingService } from '../src/app/core/messaging/messaging.service';
import { TaskService } from '../src/app/task/task.service';
import { QueueManagerService } from '../src/app/queue/queue-manager.service';
import { SchedulerService } from '../src/app/scheduler/scheduler.service';
import { FaultService } from '../src/app/fault/fault.service';

describe('Queue Worker System (e2e)', () => {
  let app: INestApplication;
  let messagingService: MessagingService;
  let taskService: TaskService;
  let queueManagerService: QueueManagerService;
  let schedulerService: SchedulerService;
  let faultService: FaultService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Get service instances
    messagingService = moduleFixture.get<MessagingService>(MessagingService);
    taskService = moduleFixture.get<TaskService>(TaskService);
    queueManagerService =
      moduleFixture.get<QueueManagerService>(QueueManagerService);
    schedulerService = moduleFixture.get<SchedulerService>(SchedulerService);
    faultService = moduleFixture.get<FaultService>(FaultService);

    // Connect to messaging service
    await messagingService.connect();
  });

  afterAll(async () => {
    await messagingService.close();
    await app.close();
  });

  describe('Health Check', () => {
    it('should return health status', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('ok');
        });
    });
  });

  describe('Task Management', () => {
    it('should create and queue a task', async () => {
      const taskData = {
        type: TaskType.HTTP_REQUEST,
        payload: {
          url: 'https://httpbin.org/get',
          method: 'GET',
        },
      };

      const response = await request(app.getHttpServer())
        .post('/tasks')
        .send(taskData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.type).toBe(TaskType.HTTP_REQUEST);
      expect(response.body.status).toBe(TaskStatus.PENDING);
      expect(response.body.payload).toEqual(taskData.payload);
    });

    it('should retrieve a task by ID', async () => {
      // First create a task
      const taskData = {
        type: TaskType.DATA_PROCESSING,
        payload: { source: 'test', operation: 'transform' },
      };

      const createResponse = await request(app.getHttpServer())
        .post('/tasks')
        .send(taskData)
        .expect(201);

      const taskId = createResponse.body.id;

      // Then retrieve it
      const getResponse = await request(app.getHttpServer())
        .get(`/tasks/${taskId}`)
        .expect(200);

      expect(getResponse.body.id).toBe(taskId);
      expect(getResponse.body.type).toBe(TaskType.DATA_PROCESSING);
    });

    it('should handle task not found', () => {
      return request(app.getHttpServer())
        .get('/tasks/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });
  });

  describe('Queue Management', () => {
    it('should return queue status', async () => {
      const response = await request(app.getHttpServer())
        .get('/queue-manager/status')
        .expect(200);

      expect(response.body).toHaveProperty('pending');
      expect(response.body).toHaveProperty('processing');
      expect(response.body).toHaveProperty('completed');
      expect(response.body).toHaveProperty('failed');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('isHealthy');
    });

    it('should check if queue is overloaded', async () => {
      const response = await request(app.getHttpServer())
        .get('/queue-manager/overloaded')
        .expect(200);

      expect(response.body).toHaveProperty('isOverloaded');
      expect(response.body).toHaveProperty('message');
    });

    it('should get failed tasks count', async () => {
      const response = await request(app.getHttpServer())
        .get('/queue-manager/failed-count')
        .expect(200);

      expect(response.body).toHaveProperty('failedTasks');
      expect(typeof response.body.failedTasks).toBe('number');
    });

    it('should get pending tasks count', async () => {
      const response = await request(app.getHttpServer())
        .get('/queue-manager/pending-count')
        .expect(200);

      expect(response.body).toHaveProperty('pendingTasks');
      expect(typeof response.body.pendingTasks).toBe('number');
    });
  });

  describe('Task Scheduling', () => {
    it('should create a scheduled task', async () => {
      const scheduledAt = new Date(Date.now() + 60000); // 1 minute from now
      const taskData = {
        type: TaskType.HTTP_REQUEST,
        payload: { url: 'https://httpbin.org/post', method: 'POST' },
        scheduledAt: scheduledAt.toISOString(),
      };

      const response = await request(app.getHttpServer())
        .post('/scheduler/tasks/scheduled')
        .send(taskData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.type).toBe(TaskType.HTTP_REQUEST);
      expect(response.body.scheduledAt).toBe(scheduledAt.toISOString());
    });

    it('should create a recurring task', async () => {
      const taskData = {
        type: TaskType.DATA_PROCESSING,
        payload: { source: 'database', operation: 'backup' },
        cronExpression: '0 0 * * *', // Daily at midnight
      };

      const response = await request(app.getHttpServer())
        .post('/scheduler/tasks/recurring')
        .send(taskData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.type).toBe(TaskType.DATA_PROCESSING);
      expect(response.body.payload.cronExpression).toBe('0 0 * * *');
      expect(response.body.payload.isRecurring).toBe(true);
    });

    it('should get scheduled tasks', async () => {
      const response = await request(app.getHttpServer())
        .get('/scheduler/tasks/scheduled')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Task Retry and Compensation', () => {
    it('should retry a failed task', async () => {
      // First create a task
      const taskData = {
        type: TaskType.HTTP_REQUEST,
        payload: { url: 'https://invalid-url-that-will-fail.com' },
      };

      const createResponse = await request(app.getHttpServer())
        .post('/tasks')
        .send(taskData)
        .expect(201);

      const taskId = createResponse.body.id;

      // Retry the task
      const retryResponse = await request(app.getHttpServer())
        .post(`/tasks/${taskId}/retry`)
        .expect(200);

      expect(retryResponse.body).toHaveProperty('message');
      expect(retryResponse.body.message).toContain('retry');
    });

    it('should handle compensation for failed task', async () => {
      // First create a task
      const taskData = {
        type: TaskType.HTTP_REQUEST,
        payload: { url: 'https://invalid-url-that-will-fail.com' },
      };

      const createResponse = await request(app.getHttpServer())
        .post('/tasks')
        .send(taskData)
        .expect(201);

      const taskId = createResponse.body.id;

      // Trigger compensation
      const compensationResponse = await request(app.getHttpServer())
        .post(`/tasks/${taskId}/compensate`)
        .expect(200);

      expect(compensationResponse.body).toHaveProperty('message');
      expect(compensationResponse.body.message).toContain('compensation');
    });
  });

  describe('Queue Operations', () => {
    it('should get queue status', async () => {
      const response = await request(app.getHttpServer())
        .get('/queue/status')
        .expect(200);

      expect(response.body).toHaveProperty('pending');
      expect(response.body).toHaveProperty('processing');
      expect(response.body).toHaveProperty('completed');
      expect(response.body).toHaveProperty('failed');
    });

    it('should get pending tasks', async () => {
      const response = await request(app.getHttpServer())
        .get('/queue/pending')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should get failed tasks', async () => {
      const response = await request(app.getHttpServer())
        .get('/queue/failed')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should retry a task from queue', async () => {
      // First create a task
      const taskData = {
        type: TaskType.DATA_PROCESSING,
        payload: { source: 'test' },
      };

      const createResponse = await request(app.getHttpServer())
        .post('/tasks')
        .send(taskData)
        .expect(201);

      const taskId = createResponse.body.id;

      // Retry from queue endpoint
      const retryResponse = await request(app.getHttpServer())
        .post(`/queue/${taskId}/retry`)
        .expect(200);

      expect(retryResponse.body).toHaveProperty('message');
    });

    it('should cancel a task', async () => {
      // First create a task
      const taskData = {
        type: TaskType.HTTP_REQUEST,
        payload: { url: 'https://httpbin.org/get' },
      };

      const createResponse = await request(app.getHttpServer())
        .post('/tasks')
        .send(taskData)
        .expect(201);

      const taskId = createResponse.body.id;

      // Cancel the task
      const cancelResponse = await request(app.getHttpServer())
        .post(`/queue/${taskId}/cancel`)
        .expect(200);

      expect(cancelResponse.body).toHaveProperty('message');
      expect(cancelResponse.body.message).toContain('cancelled');
    });
  });

  describe('System Integration', () => {
    it('should demonstrate complete task lifecycle', async () => {
      // 1. Create a task
      const taskData = {
        type: TaskType.HTTP_REQUEST,
        payload: { url: 'https://httpbin.org/get', method: 'GET' },
      };

      const createResponse = await request(app.getHttpServer())
        .post('/tasks')
        .send(taskData)
        .expect(201);

      const taskId = createResponse.body.id;

      // 2. Verify task is in pending state
      const getResponse = await request(app.getHttpServer())
        .get(`/tasks/${taskId}`)
        .expect(200);

      expect(getResponse.body.status).toBe(TaskStatus.PENDING);

      // 3. Check queue status reflects the new task
      const queueStatus = await request(app.getHttpServer())
        .get('/queue-manager/status')
        .expect(200);

      expect(queueStatus.body.pending).toBeGreaterThan(0);

      // 4. Verify task appears in pending queue
      const pendingTasks = await request(app.getHttpServer())
        .get('/queue/pending')
        .expect(200);

      const pendingTask = pendingTasks.body.find(
        (task: any) => task.id === taskId,
      );
      expect(pendingTask).toBeDefined();
    });

    it('should handle multiple concurrent tasks', async () => {
      const taskPromises = Array.from({ length: 5 }, (_, i) => {
        const taskData = {
          type: TaskType.DATA_PROCESSING,
          payload: { source: `concurrent-test-${i}`, operation: 'process' },
        };

        return request(app.getHttpServer())
          .post('/tasks')
          .send(taskData)
          .expect(201);
      });

      const responses = await Promise.all(taskPromises);

      // Verify all tasks were created
      expect(responses).toHaveLength(5);
      responses.forEach((response) => {
        expect(response.body).toHaveProperty('id');
        expect(response.body.type).toBe(TaskType.DATA_PROCESSING);
        expect(response.body.status).toBe(TaskStatus.PENDING);
      });

      // Check queue status
      const queueStatus = await request(app.getHttpServer())
        .get('/queue-manager/status')
        .expect(200);

      expect(queueStatus.body.pending).toBeGreaterThanOrEqual(5);
    });
  });
});
