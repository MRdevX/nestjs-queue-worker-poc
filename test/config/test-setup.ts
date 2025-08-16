import { faker } from '@faker-js/faker';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app/app.module';

export interface TestAppContext {
  app: INestApplication;
  moduleFixture: TestingModule;
}

/**
 * Creates a test application with proper configuration
 */
export async function createTestApp(): Promise<TestAppContext> {
  console.log('🚀 Creating test application...');

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();

  const apiPrefix = '/api';

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.enableCors({ origin: true, credentials: true });
  app.setGlobalPrefix(apiPrefix, {
    exclude: ['/'],
  });

  await app.init();

  console.log('✅ Test application created successfully');

  return { app, moduleFixture };
}

/**
 * Closes the test application
 */
export async function closeTestApp(app: INestApplication): Promise<void> {
  console.log('🧹 Closing test application...');
  try {
    await app.close();
    console.log('✅ Test application closed');
  } catch (error) {
    console.log('⚠️ Error closing test application:', error.message);
  }
}

/**
 * Test data generators
 */
export class TestDataGenerator {
  static generateCustomerId(prefix: string = 'customer-e2e'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  static generateWorkflowId(): string {
    return faker.string.uuid();
  }

  static generateInvoiceId(prefix: string = 'invoice-e2e'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  static generateStartWorkflowData(customerId?: string) {
    return {
      customerId: customerId || this.generateCustomerId(),
      dateFrom: '2024-01-01',
      dateTo: '2024-01-31',
    };
  }

  static generateScheduledWorkflowData(customerId?: string) {
    return {
      customerId: customerId || this.generateCustomerId(),
      scheduledAt: new Date(Date.now() + 60000).toISOString(),
      dateFrom: '2024-01-01',
      dateTo: '2024-01-31',
    };
  }

  static generateRecurringWorkflowData(customerId?: string) {
    return {
      customerId: customerId || this.generateCustomerId(),
      cronExpression: '0 0 * * *',
      dateFrom: '2024-01-01',
      dateTo: '2024-01-31',
    };
  }

  static generateScheduledEmailData(customerId?: string) {
    return {
      customerId: customerId || this.generateCustomerId(),
      invoiceId: this.generateInvoiceId(),
      scheduledAt: new Date(Date.now() + 120000).toISOString(),
    };
  }
}

/**
 * Test utilities
 */
export class TestUtils {
  /**
   * Waits for a specified amount of time
   */
  static async wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Retries a function until it succeeds or times out
   */
  static async retry<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    delayMs: number = 1000,
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        console.log(`⚠️ Attempt ${attempt} failed:`, error.message);

        if (attempt < maxAttempts) {
          await this.wait(delayMs);
        }
      }
    }

    throw lastError!;
  }

  /**
   * Safe database clearing with retry logic
   */
  static async clearDatabaseSafely(databaseSeeder: any): Promise<void> {
    return this.retry(
      async () => {
        await databaseSeeder.clear();
      },
      3,
      200,
    );
  }

  /**
   * Retry task retrieval with exponential backoff
   */
  static async retryTaskRetrieval(
    taskService: any,
    taskId: string,
    maxAttempts: number = 10,
    initialDelayMs: number = 100,
  ): Promise<any> {
    console.log(
      `🔄 Attempting to retrieve task ${taskId} with ${maxAttempts} max attempts...`,
    );
    return this.retry(
      async () => {
        const task = await taskService.getTaskById(taskId);
        if (!task) {
          throw new Error(`Task ${taskId} not found`);
        }
        console.log(`✅ Task ${taskId} retrieved successfully`);
        return task;
      },
      maxAttempts,
      initialDelayMs,
    );
  }

  /**
   * Validates that all required environment variables are set
   */
  static validateTestEnvironment(): void {
    const requiredEnvVars = [
      'DATABASE_HOST',
      'DATABASE_PORT',
      'DATABASE_USERNAME',
      'DATABASE_PASSWORD',
      'DATABASE_NAME',
    ];

    const missingVars = requiredEnvVars.filter(
      (varName) => !process.env[varName],
    );

    if (missingVars.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missingVars.join(', ')}`,
      );
    }

    console.log('✅ Test environment validation passed');
  }
}
