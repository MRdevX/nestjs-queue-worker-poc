import { Repository } from 'typeorm';
import { faker } from '@faker-js/faker';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TaskEntity } from '@root/app/task/task.entity';
import { TaskLogEntity } from '@root/app/task/task-log.entity';
import { WorkflowEntity } from '@root/app/workflow/workflow.entity';
import { TaskType } from '@root/app/task/types/task-type.enum';
import { TaskStatus } from '@root/app/task/types/task-status.enum';
import { LogLevel } from '@root/app/task/types/log-level.enum';

interface ISeederConfig {
  workflows: number;
  tasksPerType: number;
  customers: number;
}

@Injectable()
export class DatabaseSeeder {
  private readonly logger = new Logger(DatabaseSeeder.name);
  private config: ISeederConfig = {
    workflows: 3,
    tasksPerType: 5,
    customers: 10,
  };

  private readonly customers: string[] = [];
  private readonly workflows: WorkflowEntity[] = [];

  constructor(
    @InjectRepository(TaskEntity)
    private readonly taskRepository: Repository<TaskEntity>,
    @InjectRepository(TaskLogEntity)
    private readonly taskLogRepository: Repository<TaskLogEntity>,
    @InjectRepository(WorkflowEntity)
    private readonly workflowRepository: Repository<WorkflowEntity>,
  ) {}

  async seed(config?: Partial<ISeederConfig>): Promise<void> {
    this.logger.log('🌱 Starting database seeding...');

    // Merge custom config with default config
    if (config) {
      this.config = { ...this.config, ...config };
    }

    try {
      // Check if data already exists
      const existingTasks = await this.taskRepository.count();
      if (existingTasks > 0) {
        this.logger.log('📊 Database already contains data, skipping seeding');
        return;
      }

      // Generate customer IDs
      this.generateCustomerIds();

      // Seed workflows
      await this.seedWorkflows();

      // Seed tasks for each type
      await this.seedTasksByType();

      // Seed task logs
      await this.seedTaskLogs();

      this.logger.log('✅ Database seeding completed successfully');
    } catch (error) {
      this.logger.error('❌ Database seeding failed:', error);
      throw error;
    }
  }

  private generateCustomerIds(): void {
    this.customers.length = 0;
    for (let i = 0; i < this.config.customers; i++) {
      this.customers.push(faker.string.uuid());
    }
  }

  private async seedWorkflows(): Promise<void> {
    this.logger.log('📋 Seeding workflows...');

    const workflowTemplates = [
      {
        name: 'Invoice Generation Workflow',
        definition: {
          initialTask: {
            type: TaskType.FETCH_ORDERS,
            payload: { customerId: this.getRandomCustomer() },
          },
          transitions: {
            fetch_orders: {
              type: TaskType.CREATE_INVOICE,
              payload: { customerId: this.getRandomCustomer() },
            },
            create_invoice: {
              type: TaskType.GENERATE_PDF,
              payload: { customerId: this.getRandomCustomer() },
            },
            generate_pdf: {
              type: TaskType.SEND_EMAIL,
              payload: { customerId: this.getRandomCustomer() },
            },
          },
        },
      },
      {
        name: 'Data Processing Workflow',
        definition: {
          initialTask: {
            type: TaskType.DATA_PROCESSING,
            payload: { dataset: faker.string.alphanumeric(10) },
          },
          transitions: {
            data_processing: {
              type: TaskType.HTTP_REQUEST,
              payload: { endpoint: faker.internet.url() },
            },
          },
        },
      },
      {
        name: 'Scheduled Invoice Workflow',
        definition: {
          initialTask: {
            type: TaskType.FETCH_ORDERS,
            payload: { customerId: this.getRandomCustomer() },
          },
          transitions: {
            fetch_orders: {
              type: TaskType.CREATE_INVOICE,
              payload: { customerId: this.getRandomCustomer() },
            },
          },
        },
      },
    ];

    for (const template of workflowTemplates) {
      const workflow = this.workflowRepository.create({
        ...template,
        isActive: faker.datatype.boolean(),
      });
      const savedWorkflow = await this.workflowRepository.save(workflow);
      this.workflows.push(savedWorkflow);
      this.logger.log(
        `✅ Created workflow: ${workflow.name} (ID: ${workflow.id})`,
      );
    }
  }

  private async seedTasksByType(): Promise<void> {
    this.logger.log('📝 Seeding tasks by type...');

    const taskTypes = Object.values(TaskType);
    const taskStatuses = Object.values(TaskStatus);

    for (const taskType of taskTypes) {
      await this.seedTasksForType(taskType, taskStatuses);
    }
  }

  private async seedTasksForType(
    taskType: TaskType,
    statuses: TaskStatus[],
  ): Promise<void> {
    const tasks: Partial<TaskEntity>[] = [];

    for (let i = 0; i < this.config.tasksPerType; i++) {
      const status = statuses[i % statuses.length];
      const task = this.createTaskData(taskType, status);
      tasks.push(task);
    }

    // Batch insert for better performance
    const createdTasks = await this.taskRepository.save(tasks);

    this.logger.log(
      `✅ Created ${createdTasks.length} tasks for type: ${taskType}`,
    );
  }

  private createTaskData(
    taskType: TaskType,
    status: TaskStatus,
  ): Partial<TaskEntity> {
    const baseTask = {
      type: taskType,
      status,
      retries: faker.number.int({ min: 0, max: 3 }),
      maxRetries: 3,
      workflow: faker.helpers.arrayElement(this.workflows),
    };

    const payload = this.generatePayloadForTaskType(taskType, status);

    if (status === TaskStatus.FAILED) {
      return {
        ...baseTask,
        payload,
        error: faker.lorem.sentence(),
        retries: 3,
      };
    }

    if (status === TaskStatus.PENDING) {
      return {
        ...baseTask,
        payload,
        scheduledAt: faker.date.future(),
      };
    }

    return {
      ...baseTask,
      payload,
    };
  }

  private generatePayloadForTaskType(
    taskType: TaskType,
    status: TaskStatus,
  ): Record<string, any> {
    const customerId = this.getRandomCustomer();

    switch (taskType) {
      case TaskType.FETCH_ORDERS:
        return {
          customerId,
          dateFrom: faker.date.past().toISOString(),
          dateTo: faker.date.recent().toISOString(),
          ...(status === TaskStatus.COMPLETED && {
            orders: this.generateOrders(customerId),
          }),
        };

      case TaskType.CREATE_INVOICE:
        return {
          customerId,
          ...(status === TaskStatus.COMPLETED && {
            orders: this.generateOrders(customerId),
            invoice: this.generateInvoice(customerId),
          }),
        };

      case TaskType.GENERATE_PDF:
        return {
          customerId,
          ...(status === TaskStatus.COMPLETED && {
            invoice: this.generateInvoice(customerId),
            pdfUrl: faker.internet.url(),
          }),
        };

      case TaskType.SEND_EMAIL:
        return {
          customerId,
          ...(status === TaskStatus.COMPLETED && {
            invoice: this.generateInvoice(customerId),
            pdfUrl: faker.internet.url(),
            emailSent: true,
            recipientEmail: faker.internet.email(),
          }),
        };

      case TaskType.HTTP_REQUEST:
        return {
          url: faker.internet.url(),
          method: faker.helpers.arrayElement(['GET', 'POST', 'PUT', 'DELETE']),
          headers: { 'Content-Type': 'application/json' },
          ...(status === TaskStatus.COMPLETED && {
            response: { status: 200, data: faker.lorem.paragraph() },
          }),
        };

      case TaskType.DATA_PROCESSING:
        return {
          dataset: faker.string.alphanumeric(10),
          operation: faker.helpers.arrayElement([
            'transform',
            'validate',
            'aggregate',
          ]),
          ...(status === TaskStatus.COMPLETED && {
            result: { processed: faker.number.int({ min: 100, max: 1000 }) },
          }),
        };

      case TaskType.COMPENSATION:
        return {
          originalTaskId: faker.string.uuid(),
          originalTaskType: faker.helpers.arrayElement(Object.values(TaskType)),
          reason: faker.lorem.sentence(),
          ...(status === TaskStatus.COMPLETED && {
            compensationApplied: true,
          }),
        };

      default:
        return { data: faker.lorem.paragraph() };
    }
  }

  private generateOrders(customerId: string): any[] {
    const orderCount = faker.number.int({ min: 1, max: 5 });
    const orders: any[] = [];

    for (let i = 0; i < orderCount; i++) {
      const itemCount = faker.number.int({ min: 1, max: 4 });
      const items: any[] = [];

      for (let j = 0; j < itemCount; j++) {
        items.push({
          id: faker.string.uuid(),
          name: faker.commerce.productName(),
          price: parseFloat(faker.commerce.price()),
          quantity: faker.number.int({ min: 1, max: 10 }),
        });
      }

      const totalAmount = items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );

      orders.push({
        id: faker.string.uuid(),
        customerId,
        status: faker.helpers.arrayElement([
          'delivered',
          'pending',
          'cancelled',
        ]),
        invoiced: faker.datatype.boolean(),
        items,
        totalAmount,
        deliveryDate: faker.date.recent().toISOString(),
      });
    }

    return orders;
  }

  private generateInvoice(customerId: string): any {
    const items = Array.from(
      { length: faker.number.int({ min: 1, max: 5 }) },
      () => ({
        id: faker.string.uuid(),
        name: faker.commerce.productName(),
        price: parseFloat(faker.commerce.price()),
        quantity: faker.number.int({ min: 1, max: 10 }),
      }),
    );

    const totalAmount = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    return {
      id: faker.string.uuid(),
      invoiceNumber: `INV-${faker.number.int({ min: 2020, max: 2024 })}-${faker.number.int({ min: 1, max: 9999 }).toString().padStart(4, '0')}`,
      customerId,
      totalAmount,
      grandTotal: totalAmount,
      items,
      createdAt: faker.date.recent(),
    };
  }

  private async seedTaskLogs(): Promise<void> {
    this.logger.log('📋 Seeding task logs...');

    const tasks = await this.taskRepository.find();
    const logEntries: Partial<TaskLogEntity>[] = [];

    for (const task of tasks) {
      // Create log entry for task creation
      logEntries.push({
        task: task,
        level: LogLevel.INFO,
        message: `Task ${task.type} created`,
        timestamp: task.createdAt,
      });

      // Create log entry based on task status
      if (task.status === TaskStatus.COMPLETED) {
        logEntries.push({
          task: task,
          level: LogLevel.INFO,
          message: `Task ${task.type} completed successfully`,
          timestamp: task.updatedAt,
        });
      } else if (task.status === TaskStatus.FAILED) {
        logEntries.push({
          task: task,
          level: LogLevel.ERROR,
          message: `Task ${task.type} failed: ${task.error}`,
          timestamp: task.updatedAt,
        });
      } else if (task.status === TaskStatus.PROCESSING) {
        logEntries.push({
          task: task,
          level: LogLevel.INFO,
          message: `Task ${task.type} started processing`,
          timestamp: task.updatedAt,
        });
      } else if (task.status === TaskStatus.RETRYING) {
        logEntries.push({
          task: task,
          level: LogLevel.WARNING,
          message: `Task ${task.type} retrying (attempt ${task.retries})`,
          timestamp: task.updatedAt,
        });
      }

      // Add some random log entries for variety
      if (faker.datatype.boolean()) {
        logEntries.push({
          task: task,
          level: faker.helpers.arrayElement(Object.values(LogLevel)),
          message: faker.lorem.sentence(),
          timestamp: faker.date.between({
            from: task.createdAt,
            to: new Date(),
          }),
        });
      }
    }

    await this.taskLogRepository.save(logEntries);
    this.logger.log(`✅ Created ${logEntries.length} log entries`);
  }

  private getRandomCustomer(): string {
    return faker.helpers.arrayElement(this.customers);
  }

  async clear(): Promise<void> {
    this.logger.log('🧹 Clearing database...');

    try {
      await this.taskLogRepository.clear();
      await this.taskRepository.clear();
      await this.workflowRepository.clear();

      this.logger.log('✅ Database cleared successfully');
    } catch (error) {
      this.logger.error('❌ Database clearing failed:', error);
      throw error;
    }
  }
}
