/* eslint-disable @typescript-eslint/naming-convention */
import { Repository } from 'typeorm';
import { faker } from '@faker-js/faker';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TaskEntity } from '@root/app/task/task.entity';
import { TaskLogEntity } from '@root/app/task/task-log.entity';
import {
  WorkflowEntity,
  WorkflowStatus,
} from '@root/app/workflow/workflow.entity';
import { TaskType } from '@root/app/task/types/task-type.enum';
import { TaskStatus } from '@root/app/task/types/task-status.enum';
import { LogLevel } from '@root/app/task/types/log-level.enum';

export interface ISeederConfig {
  workflows: number;
  tasksPerType: number;
  customers: number;
}

export interface ISeederResult {
  workflows: number;
  tasks: number;
  taskLogs: number;
}

@Injectable()
export class DatabaseSeeder {
  private readonly logger = new Logger(DatabaseSeeder.name);
  private customers: string[] = [];

  private config: ISeederConfig = {
    workflows: 3,
    tasksPerType: 5,
    customers: 10,
  };

  constructor(
    @InjectRepository(TaskEntity)
    private readonly taskRepository: Repository<TaskEntity>,
    @InjectRepository(TaskLogEntity)
    private readonly taskLogRepository: Repository<TaskLogEntity>,
    @InjectRepository(WorkflowEntity)
    private readonly workflowRepository: Repository<WorkflowEntity>,
  ) {}

  async seed(config?: Partial<ISeederConfig>): Promise<ISeederResult> {
    this.logger.log('Starting database seeding...');

    if (config) {
      this.config = { ...this.config, ...config };
    }

    try {
      if (await this.hasExistingData()) {
        this.logger.log('Database already contains data, skipping seeding');
        return { workflows: 0, tasks: 0, taskLogs: 0 };
      }

      this.customers = Array.from({ length: this.config.customers }, () =>
        faker.string.uuid(),
      );

      const workflows = await this.seedWorkflows();
      const tasks = await this.seedTasks(workflows);
      const taskLogs = await this.seedTaskLogs(tasks);

      const result: ISeederResult = {
        workflows: workflows.length,
        tasks: tasks.length,
        taskLogs: taskLogs.length,
      };

      this.logger.log('Database seeding completed successfully', result);
      return result;
    } catch (error) {
      this.logger.error('Database seeding failed:', error);
      throw error;
    }
  }

  private async hasExistingData(): Promise<boolean> {
    const [taskCount, workflowCount, taskLogCount] = await Promise.all([
      this.taskRepository.count(),
      this.workflowRepository.count(),
      this.taskLogRepository.count(),
    ]);
    return taskCount > 0 || workflowCount > 0 || taskLogCount > 0;
  }

  private async seedWorkflows(): Promise<WorkflowEntity[]> {
    this.logger.log('Seeding workflows...');

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
        status: WorkflowStatus.PENDING,
        isActive: true,
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
        status: WorkflowStatus.RUNNING,
        isActive: true,
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
        status: WorkflowStatus.COMPLETED,
        isActive: true,
      },
      {
        name: 'Failed Workflow',
        definition: {
          initialTask: {
            type: TaskType.FETCH_ORDERS,
            payload: { customerId: this.getRandomCustomer() },
          },
          transitions: {},
        },
        status: WorkflowStatus.FAILED,
        isActive: false,
        error: 'Workflow failed due to external service unavailability',
      },
    ];

    const workflows = await Promise.all(
      workflowTemplates.map(async (template) => {
        const workflow = this.workflowRepository.create(template);
        return this.workflowRepository.save(workflow);
      }),
    );

    this.logger.log(`Created ${workflows.length} workflows`);
    return workflows;
  }

  private async seedTasks(workflows: WorkflowEntity[]): Promise<TaskEntity[]> {
    this.logger.log('Seeding tasks...');

    const taskTypes = Object.values(TaskType);
    const taskStatuses = Object.values(TaskStatus);
    const allTasks: TaskEntity[] = [];

    for (const taskType of taskTypes) {
      const tasks = Array.from({ length: this.config.tasksPerType }, (_, i) => {
        const status = taskStatuses[i % taskStatuses.length];
        return this.createTask(taskType, status, workflows);
      });

      const createdTasks = await this.taskRepository.save(tasks);
      allTasks.push(...createdTasks);
    }

    await this.createParentChildRelationships(allTasks);

    this.logger.log(`Created ${allTasks.length} tasks total`);
    return allTasks;
  }

  private createTask(
    taskType: TaskType,
    status: TaskStatus,
    workflows: WorkflowEntity[],
  ): Partial<TaskEntity> {
    const baseTask = {
      type: taskType,
      status,
      retries: faker.number.int({ min: 0, max: 3 }),
      maxRetries: 3,
      retryDelay: faker.number.int({ min: 1000, max: 5000 }),
      maxRetryDelay: faker.number.int({ min: 30000, max: 60000 }),
      workflow: faker.helpers.arrayElement(workflows),
      payload: this.generatePayload(taskType, status),
    };

    if (status === TaskStatus.FAILED) {
      return { ...baseTask, error: faker.lorem.sentence(), retries: 3 };
    }

    if (status === TaskStatus.PENDING) {
      return { ...baseTask, scheduledAt: faker.date.future() };
    }

    if (status === TaskStatus.CANCELLED) {
      return { ...baseTask, error: 'Task was cancelled by user' };
    }

    return baseTask;
  }

  private async createParentChildRelationships(
    tasks: TaskEntity[],
  ): Promise<void> {
    const parentTasks = tasks.filter((task) =>
      [TaskType.FETCH_ORDERS, TaskType.CREATE_INVOICE].includes(task.type),
    );

    const childTasks = tasks.filter((task) =>
      [
        TaskType.GENERATE_PDF,
        TaskType.SEND_EMAIL,
        TaskType.COMPENSATION,
      ].includes(task.type),
    );

    console.log('Parent-child task relationships are no longer supported');
  }

  private generatePayload(
    taskType: TaskType,
    status: TaskStatus,
  ): Record<string, any> {
    const customerId = this.getRandomCustomer();
    const isCompleted = status === TaskStatus.COMPLETED;

    const payloads = {
      [TaskType.FETCH_ORDERS]: {
        customerId,
        dateFrom: faker.date.past().toISOString(),
        dateTo: faker.date.recent().toISOString(),
        ...(isCompleted && { orders: this.generateOrders(customerId) }),
      },
      [TaskType.CREATE_INVOICE]: {
        customerId,
        ...(isCompleted && {
          orders: this.generateOrders(customerId),
          invoice: this.generateInvoice(customerId),
        }),
      },
      [TaskType.GENERATE_PDF]: {
        customerId,
        ...(isCompleted && {
          invoice: this.generateInvoice(customerId),
          pdfUrl: faker.internet.url(),
        }),
      },
      [TaskType.SEND_EMAIL]: {
        customerId,
        ...(isCompleted && {
          invoice: this.generateInvoice(customerId),
          pdfUrl: faker.internet.url(),
          emailSent: true,
          recipientEmail: faker.internet.email(),
        }),
      },
      [TaskType.HTTP_REQUEST]: {
        url: faker.internet.url(),
        method: faker.helpers.arrayElement(['GET', 'POST', 'PUT', 'DELETE']),
        headers: { 'Content-Type': 'application/json' },
        ...(isCompleted && {
          response: { status: 200, data: faker.lorem.paragraph() },
        }),
      },
      [TaskType.DATA_PROCESSING]: {
        dataset: faker.string.alphanumeric(10),
        operation: faker.helpers.arrayElement([
          'transform',
          'validate',
          'aggregate',
        ]),
        ...(isCompleted && {
          result: { processed: faker.number.int({ min: 100, max: 1000 }) },
        }),
      },
      [TaskType.COMPENSATION]: {
        originalTaskId: faker.string.uuid(),
        originalTaskType: faker.helpers.arrayElement(Object.values(TaskType)),
        reason: faker.lorem.sentence(),
        ...(isCompleted && { compensationApplied: true }),
      },
    };

    return payloads[taskType] || { data: faker.lorem.paragraph() };
  }

  private generateOrders(customerId: string): any[] {
    return Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () => {
      const items = Array.from(
        { length: faker.number.int({ min: 1, max: 4 }) },
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
      };
    });
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

  private async seedTaskLogs(tasks: TaskEntity[]): Promise<TaskLogEntity[]> {
    this.logger.log('Seeding task logs...');

    const logEntries: Partial<TaskLogEntity>[] = [];

    for (const task of tasks) {
      logEntries.push({
        task,
        level: LogLevel.INFO,
        message: `Task ${task.type} created`,
        timestamp: task.createdAt,
        context: {
          taskId: task.id,
          taskType: task.type,
          workflowId: task.workflow?.id,
        },
      });

      const statusMessages = {
        [TaskStatus.COMPLETED]: `Task ${task.type} completed successfully`,
        [TaskStatus.FAILED]: `Task ${task.type} failed: ${task.error}`,
        [TaskStatus.PROCESSING]: `Task ${task.type} started processing`,
        [TaskStatus.RETRYING]: `Task ${task.type} retrying (attempt ${task.retries})`,
        [TaskStatus.CANCELLED]: `Task ${task.type} was cancelled`,
      };

      if (statusMessages[task.status]) {
        logEntries.push({
          task,
          level:
            task.status === TaskStatus.FAILED
              ? LogLevel.ERROR
              : task.status === TaskStatus.RETRYING ||
                  task.status === TaskStatus.CANCELLED
                ? LogLevel.WARNING
                : LogLevel.INFO,
          message: statusMessages[task.status],
          timestamp: task.updatedAt,
          context: {
            taskId: task.id,
            taskType: task.type,
            status: task.status,
            retries: task.retries,
            error: task.error,
          },
        });
      }

      if (faker.datatype.boolean()) {
        logEntries.push({
          task,
          level: faker.helpers.arrayElement(Object.values(LogLevel)),
          message: faker.lorem.sentence(),
          timestamp: faker.date.between({
            from: task.createdAt,
            to: new Date(),
          }),
          context: {
            taskId: task.id,
            taskType: task.type,
            customField: faker.string.alphanumeric(8),
          },
        });
      }
    }

    const createdLogs = await this.taskLogRepository.save(logEntries);
    this.logger.log(`Created ${createdLogs.length} log entries`);
    return createdLogs;
  }

  private getRandomCustomer(): string {
    return faker.helpers.arrayElement(this.customers);
  }

  async clear(): Promise<void> {
    this.logger.log('Clearing database...');

    try {
      const queryRunner =
        this.taskRepository.manager.connection.createQueryRunner();

      await queryRunner.query('SET session_replication_role = replica;');

      await queryRunner.query('TRUNCATE TABLE "task_log_entity" CASCADE;');
      await queryRunner.query('TRUNCATE TABLE "task_entity" CASCADE;');
      await queryRunner.query('TRUNCATE TABLE "workflow_entity" CASCADE;');

      await queryRunner.query('SET session_replication_role = DEFAULT;');

      await queryRunner.release();

      this.customers = [];

      this.logger.log('Database cleared successfully');
    } catch (error) {
      this.logger.error('Database clearing failed:', error);
      throw error;
    }
  }
}
