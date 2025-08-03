import { Repository } from 'typeorm';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TaskEntity } from '../../task/task.entity';
import { TaskLogEntity } from '../../task/task-log.entity';
import { WorkflowEntity } from '../../workflow/workflow.entity';
import { TaskType } from '../../task/types/task-type.enum';
import { TaskStatus } from '../../task/types/task-status.enum';
import { LogLevel } from '../../task/types/log-level.enum';

@Injectable()
export class DatabaseSeeder {
  private readonly logger = new Logger(DatabaseSeeder.name);

  constructor(
    @InjectRepository(TaskEntity)
    private readonly taskRepository: Repository<TaskEntity>,
    @InjectRepository(TaskLogEntity)
    private readonly taskLogRepository: Repository<TaskLogEntity>,
    @InjectRepository(WorkflowEntity)
    private readonly workflowRepository: Repository<WorkflowEntity>,
  ) {}

  async seed(): Promise<void> {
    this.logger.log('🌱 Starting database seeding...');

    try {
      // Check if data already exists
      const existingTasks = await this.taskRepository.count();
      if (existingTasks > 0) {
        this.logger.log('📊 Database already contains data, skipping seeding');
        return;
      }

      // Seed workflows
      await this.seedWorkflows();

      // Seed sample tasks
      await this.seedSampleTasks();

      // Seed task logs
      await this.seedTaskLogs();

      this.logger.log('✅ Database seeding completed successfully');
    } catch (error) {
      this.logger.error('❌ Database seeding failed:', error);
      throw error;
    }
  }

  private async seedWorkflows(): Promise<void> {
    this.logger.log('📋 Seeding workflows...');

    const workflows = [
      {
        name: 'Invoice Generation Workflow',
        definition: {
          initialTask: {
            type: TaskType.FETCH_ORDERS,
            payload: {
              customerId: 'customer-123',
              dateFrom: '2024-01-01',
              dateTo: '2024-01-31',
            },
          },
          transitions: {
            fetch_orders: {
              type: TaskType.CREATE_INVOICE,
              payload: {
                customerId: 'customer-123',
              },
            },
            create_invoice: {
              type: TaskType.GENERATE_PDF,
              payload: {
                customerId: 'customer-123',
              },
            },
            generate_pdf: {
              type: TaskType.SEND_EMAIL,
              payload: {
                customerId: 'customer-123',
              },
            },
          },
        },
        isActive: true,
      },
      {
        name: 'Scheduled Invoice Workflow',
        definition: {
          initialTask: {
            type: TaskType.FETCH_ORDERS,
            payload: {
              customerId: 'customer-456',
              dateFrom: '2024-01-01',
              dateTo: '2024-01-31',
            },
          },
          transitions: {
            fetch_orders: {
              type: TaskType.CREATE_INVOICE,
              payload: {
                customerId: 'customer-456',
              },
            },
          },
        },
        isActive: true,
      },
    ];

    for (const workflowData of workflows) {
      const workflow = this.workflowRepository.create(workflowData);
      await this.workflowRepository.save(workflow);
      this.logger.log(
        `✅ Created workflow: ${workflow.name} (ID: ${workflow.id})`,
      );
    }
  }

  private async seedSampleTasks(): Promise<void> {
    this.logger.log('📝 Seeding sample tasks...');

    const sampleTasks = [
      {
        type: TaskType.FETCH_ORDERS,
        payload: {
          customerId: 'customer-123',
          dateFrom: '2024-01-01',
          dateTo: '2024-01-31',
          orders: [
            {
              id: 'order-1',
              customerId: 'customer-123',
              status: 'delivered',
              invoiced: false,
              items: [
                { id: 'item-1', name: 'Product A', price: 100, quantity: 2 },
                { id: 'item-2', name: 'Product B', price: 50, quantity: 1 },
              ],
              totalAmount: 250,
              deliveryDate: '2024-01-15',
            },
            {
              id: 'order-2',
              customerId: 'customer-123',
              status: 'delivered',
              invoiced: false,
              items: [
                { id: 'item-3', name: 'Product C', price: 75, quantity: 3 },
              ],
              totalAmount: 225,
              deliveryDate: '2024-01-16',
            },
          ],
        },
        status: TaskStatus.COMPLETED,
        retries: 0,
        maxRetries: 3,
      },
      {
        type: TaskType.CREATE_INVOICE,
        payload: {
          customerId: 'customer-123',
          orders: [
            {
              id: 'order-1',
              customerId: 'customer-123',
              status: 'delivered',
              invoiced: false,
              items: [
                { id: 'item-1', name: 'Product A', price: 100, quantity: 2 },
                { id: 'item-2', name: 'Product B', price: 50, quantity: 1 },
              ],
              totalAmount: 250,
              deliveryDate: '2024-01-15',
            },
            {
              id: 'order-2',
              customerId: 'customer-123',
              status: 'delivered',
              invoiced: false,
              items: [
                { id: 'item-3', name: 'Product C', price: 75, quantity: 3 },
              ],
              totalAmount: 225,
              deliveryDate: '2024-01-16',
            },
          ],
          invoice: {
            id: 'invoice-123',
            invoiceNumber: 'INV-2024-001',
            customerId: 'customer-123',
            totalAmount: 475,
            grandTotal: 475,
            items: [
              { id: 'item-1', name: 'Product A', price: 100, quantity: 2 },
              { id: 'item-2', name: 'Product B', price: 50, quantity: 1 },
              { id: 'item-3', name: 'Product C', price: 75, quantity: 3 },
            ],
            createdAt: new Date(),
          },
        },
        status: TaskStatus.COMPLETED,
        retries: 0,
        maxRetries: 3,
      },
      {
        type: TaskType.GENERATE_PDF,
        payload: {
          customerId: 'customer-123',
          invoice: {
            id: 'invoice-123',
            invoiceNumber: 'INV-2024-001',
            customerId: 'customer-123',
            totalAmount: 475,
            grandTotal: 475,
          },
          pdfUrl: 'https://example.com/invoices/invoice-123.pdf',
        },
        status: TaskStatus.COMPLETED,
        retries: 0,
        maxRetries: 3,
      },
      {
        type: TaskType.SEND_EMAIL,
        payload: {
          customerId: 'customer-123',
          invoice: {
            id: 'invoice-123',
            invoiceNumber: 'INV-2024-001',
            customerId: 'customer-123',
            totalAmount: 475,
            grandTotal: 475,
          },
          pdfUrl: 'https://example.com/invoices/invoice-123.pdf',
          emailSent: true,
          recipientEmail: 'customer@example.com',
        },
        status: TaskStatus.COMPLETED,
        retries: 0,
        maxRetries: 3,
      },
      // Failed task for testing
      {
        type: TaskType.FETCH_ORDERS,
        payload: {
          customerId: 'customer-failed',
          dateFrom: '2024-01-01',
          dateTo: '2024-01-31',
        },
        status: TaskStatus.FAILED,
        error: 'Simulated failure for testing',
        retries: 3,
        maxRetries: 3,
      },
      // Pending task for testing
      {
        type: TaskType.FETCH_ORDERS,
        payload: {
          customerId: 'customer-pending',
          dateFrom: '2024-01-01',
          dateTo: '2024-01-31',
        },
        status: TaskStatus.PENDING,
        retries: 0,
        maxRetries: 3,
      },
    ];

    for (const taskData of sampleTasks) {
      const task = this.taskRepository.create(taskData);
      await this.taskRepository.save(task);
      this.logger.log(
        `✅ Created task: ${task.type} (ID: ${task.id}, Status: ${task.status})`,
      );
    }
  }

  private async seedTaskLogs(): Promise<void> {
    this.logger.log('📋 Seeding task logs...');

    const tasks = await this.taskRepository.find();
    const logEntries = [];

    for (const task of tasks) {
      // Create log entries for each task
      logEntries.push(
        this.taskLogRepository.create({
          task: { id: task.id },
          level: LogLevel.INFO,
          message: `Task ${task.type} created`,
          timestamp: task.createdAt,
        }),
      );

      if (task.status === TaskStatus.COMPLETED) {
        logEntries.push(
          this.taskLogRepository.create({
            task: { id: task.id },
            level: LogLevel.INFO,
            message: `Task ${task.type} completed successfully`,
            timestamp: task.updatedAt,
          }),
        );
      } else if (task.status === TaskStatus.FAILED) {
        logEntries.push(
          this.taskLogRepository.create({
            task: { id: task.id },
            level: LogLevel.ERROR,
            message: `Task ${task.type} failed: ${task.error}`,
            timestamp: task.updatedAt,
          }),
        );
      }
    }

    await this.taskLogRepository.save(logEntries);
    this.logger.log(`✅ Created ${logEntries.length} log entries`);
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
