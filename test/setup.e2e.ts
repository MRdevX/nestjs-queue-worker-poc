import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app/app.module';
import { MessagingService } from '../src/app/core/messaging/messaging.service';
import { ConfigService } from '@nestjs/config';

// Global test setup
let app: INestApplication;
let messagingService: MessagingService;

beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.DB_SYNCHRONIZE = 'true';
  process.env.RABBITMQ_HOST = 'localhost';
  process.env.RABBITMQ_PORT = '5672';
  process.env.RABBITMQ_USER = 'guest';
  process.env.RABBITMQ_PASSWORD = 'guest';
  process.env.RABBITMQ_QUEUE_NAME = 'test_queue';

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleFixture.createNestApplication();
  await app.init();

  messagingService = moduleFixture.get<MessagingService>(MessagingService);

  try {
    await messagingService.connect();
  } catch (error) {
    console.warn('Could not connect to RabbitMQ for testing:', error.message);
  }
}, 30000); // Increase timeout for setup

afterAll(async () => {
  try {
    await messagingService.close();
  } catch (error) {
    console.warn('Error closing messaging service:', error.message);
  }

  if (app) {
    await app.close();
  }
}, 10000);

// Export for use in individual test files
export { app, messagingService };

// Helper function to wait for task processing
export const waitForTaskProcessing = async (delay: number = 2000) => {
  return new Promise((resolve) => setTimeout(resolve, delay));
};

// Helper function to create test task
export const createTestTask = async (taskData: any) => {
  return app
    .getHttpServer()
    .request('POST', '/tasks')
    .send(taskData)
    .expect(201);
};

// Helper function to get task status
export const getTaskStatus = async (taskId: string) => {
  return app.getHttpServer().request('GET', `/tasks/${taskId}`).expect(200);
};

// Helper function to retry task
export const retryTask = async (taskId: string) => {
  return app
    .getHttpServer()
    .request('POST', `/tasks/${taskId}/retry`)
    .expect(200);
};

// Helper function to compensate task
export const compensateTask = async (taskId: string) => {
  return app
    .getHttpServer()
    .request('POST', `/tasks/${taskId}/compensate`)
    .expect(200);
};
