import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TaskService } from '../task/task.service';
import { TaskQueueService } from '../queue/task-queue.service';
import { MessagingService } from '../core/messaging/services/messaging.service';
import { SchedulerService } from '../scheduler/scheduler.service';
import { UtilsService } from '../core/utils/utils.service';
import { TaskType } from '../task/types/task-type.enum';
import { TaskStatus } from '../task/types/task-status.enum';
import {
  StartInvoiceWorkflowDto,
  CreateScheduledInvoiceWorkflowDto,
  CreateRecurringInvoiceWorkflowDto,
  CreateScheduledEmailWorkflowDto,
  InvoiceWorkflowResponseDto,
  CustomerInvoiceTasksResponseDto,
  InvoiceWorkflowStatusResponseDto,
} from './types/invoice.dto';

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(
    private readonly taskService: TaskService,
    private readonly taskQueueService: TaskQueueService,
    private readonly messagingService: MessagingService,
    private readonly schedulerService: SchedulerService,
    private readonly configService: ConfigService,
  ) {}

  // Main workflow methods
  async startInvoiceWorkflow(
    dto: StartInvoiceWorkflowDto,
  ): Promise<InvoiceWorkflowResponseDto> {
    this.logger.log(
      `Starting invoice workflow for customer: ${dto.customerId}`,
    );

    const task = await this.taskService.createTask(
      TaskType.FETCH_ORDERS,
      {
        customerId: dto.customerId,
        dateFrom: dto.dateFrom,
        dateTo: dto.dateTo,
      },
      dto.workflowId,
    );

    await this.taskQueueService.enqueueTask(
      TaskType.FETCH_ORDERS,
      task.payload,
      dto.workflowId,
    );

    return {
      message: 'Invoice workflow started',
      taskId: task.id,
      workflowId: dto.workflowId,
    };
  }

  async createScheduledInvoiceWorkflow(
    dto: CreateScheduledInvoiceWorkflowDto,
  ): Promise<InvoiceWorkflowResponseDto> {
    const task = await this.taskService.createTask(
      TaskType.FETCH_ORDERS,
      {
        customerId: dto.customerId,
        dateFrom: dto.dateFrom,
        dateTo: dto.dateTo,
      },
      dto.workflowId,
    );

    await this.taskQueueService.enqueueTask(
      TaskType.FETCH_ORDERS,
      task.payload,
      dto.workflowId,
      {
        delay: this.calculateDelay(dto.scheduledAt),
        metadata: { scheduledAt: dto.scheduledAt },
      },
    );

    return {
      message: 'Scheduled invoice workflow created',
      taskId: task.id,
      workflowId: dto.workflowId,
      scheduledAt: dto.scheduledAt,
    };
  }

  async createRecurringInvoiceWorkflow(
    dto: CreateRecurringInvoiceWorkflowDto,
  ): Promise<InvoiceWorkflowResponseDto> {
    const task = await this.schedulerService.createRecurringTask(
      TaskType.FETCH_ORDERS,
      {
        customerId: dto.customerId,
        dateFrom: dto.dateFrom,
        dateTo: dto.dateTo,
      },
      dto.cronExpression,
      dto.workflowId,
    );

    return {
      message: 'Recurring invoice workflow created',
      taskId: task.id,
      cronExpression: dto.cronExpression,
      workflowId: dto.workflowId,
    };
  }

  async createScheduledEmailWorkflow(
    dto: CreateScheduledEmailWorkflowDto,
  ): Promise<InvoiceWorkflowResponseDto> {
    const scheduledAt = UtilsService.validateAndParseDate(dto.scheduledAt);

    const task = await this.schedulerService.createScheduledTask(
      TaskType.SEND_EMAIL,
      {
        customerId: dto.customerId,
        invoiceId: dto.invoiceId,
      },
      scheduledAt,
      dto.workflowId,
    );

    return {
      message: 'Scheduled email workflow created',
      taskId: task.id,
      scheduledAt: scheduledAt.toISOString(),
      workflowId: dto.workflowId,
    };
  }

  // Workflow coordination methods
  async handleTaskCompletion(taskId: string): Promise<void> {
    const task = await this.taskService.getTaskById(taskId);
    if (!task) {
      this.logger.error(`Task not found: ${taskId}`);
      return;
    }

    switch (task.type) {
      case TaskType.FETCH_ORDERS:
        await this.handleFetchOrdersCompletion(taskId);
        break;
      case TaskType.CREATE_INVOICE:
        await this.handleCreateInvoiceCompletion(taskId);
        break;
      case TaskType.GENERATE_PDF:
        await this.handleGeneratePdfCompletion(taskId);
        break;
      case TaskType.SEND_EMAIL:
        await this.handleSendEmailCompletion(taskId);
        break;
      default:
        this.logger.debug(`No specific handling for task type ${task.type}`);
    }
  }

  async handleTaskFailure(taskId: string, error: Error): Promise<void> {
    const task = await this.taskService.getTaskById(taskId);
    if (!task) {
      this.logger.error(`Task not found: ${taskId}`);
      return;
    }

    const compensationTask = await this.taskService.createTask(
      TaskType.COMPENSATION,
      {
        originalTaskId: taskId,
        originalTaskType: task.type,
        customerId: task.payload.customerId,
        reason: error.message,
      },
      task.workflow?.id,
    );

    await this.messagingService.publishTask(
      compensationTask.type,
      compensationTask.id,
    );
  }

  // Private workflow step handlers
  private async handleFetchOrdersCompletion(taskId: string): Promise<void> {
    const task = await this.taskService.getTaskById(taskId);
    const { customerId, orders } = task.payload;

    if (!orders || orders.length === 0) {
      this.logger.log(`No deliverable orders for customer: ${customerId}`);
      return;
    }

    const createInvoiceTask = await this.taskService.createTask(
      TaskType.CREATE_INVOICE,
      { customerId, orders },
      task.workflow?.id,
    );

    await this.messagingService.publishTask(
      createInvoiceTask.type,
      createInvoiceTask.id,
    );
  }

  private async handleCreateInvoiceCompletion(taskId: string): Promise<void> {
    const task = await this.taskService.getTaskById(taskId);
    const { customerId, invoice } = task.payload;

    if (!invoice) {
      throw new Error('Invoice data not found in task payload');
    }

    const pdfProcessorUrl =
      task.payload.pdfProcessorUrl ||
      this.configService.get('invoice.pdfProcessor.url');

    const generatePdfTask = await this.taskService.createTask(
      TaskType.GENERATE_PDF,
      { customerId, invoice, pdfProcessorUrl },
      task.workflow?.id,
    );

    await this.messagingService.publishTask(
      generatePdfTask.type,
      generatePdfTask.id,
    );
  }

  private async handleGeneratePdfCompletion(taskId: string): Promise<void> {
    const task = await this.taskService.getTaskById(taskId);
    const { customerId, invoice, pdfUrl } = task.payload;

    if (!pdfUrl) {
      throw new Error('PDF URL not found in task payload');
    }

    const emailServiceUrl =
      task.payload.emailServiceUrl ||
      this.configService.get('invoice.emailService.url');

    const sendEmailTask = await this.taskService.createTask(
      TaskType.SEND_EMAIL,
      { customerId, invoice, pdfUrl, emailServiceUrl },
      task.workflow?.id,
    );

    await this.messagingService.publishTask(
      sendEmailTask.type,
      sendEmailTask.id,
    );
  }

  private async handleSendEmailCompletion(taskId: string): Promise<void> {
    const task = await this.taskService.getTaskById(taskId);
    const { customerId, invoice } = task.payload;

    this.logger.log(
      `Invoice workflow completed for customer: ${customerId}, invoice: ${invoice?.id}`,
    );
  }

  // Query methods
  async getCustomerInvoiceTasks(
    customerId: string,
  ): Promise<CustomerInvoiceTasksResponseDto> {
    const allTasks = await this.taskService.findTasks();
    const tasks = allTasks.filter(
      (task) => task.payload?.customerId === customerId,
    );

    return {
      customerId,
      tasks: tasks.map((task) => ({
        id: task.id,
        type: task.type,
        status: task.status,
        createdAt: task.createdAt,
        completedAt:
          task.status === TaskStatus.COMPLETED ? task.updatedAt : null,
      })),
    };
  }

  async getInvoiceWorkflowStatus(
    customerId: string,
  ): Promise<InvoiceWorkflowStatusResponseDto> {
    const allTasks = await this.taskService.findTasks();
    const tasks = allTasks.filter(
      (task) => task.payload?.customerId === customerId,
    );

    const statusCounts = this.countTasksByStatus(tasks);
    const workflowGroups = UtilsService.groupBy(
      tasks,
      (task) => task.workflow?.id || 'standalone',
    );

    const workflows: Record<string, any> = {};
    for (const [workflowId, workflowTasks] of Object.entries(workflowGroups)) {
      workflows[workflowId] = this.calculateWorkflowGroupStatus(workflowTasks);
    }

    return {
      customerId,
      totalTasks: statusCounts.total,
      completedTasks: statusCounts.completed,
      failedTasks: statusCounts.failed,
      pendingTasks: statusCounts.pending,
      processingTasks: statusCounts.processing,
      workflows,
    };
  }

  // Helper methods
  private countTasksByStatus(tasks: any[]) {
    const counts = {
      total: tasks.length,
      completed: 0,
      failed: 0,
      pending: 0,
      processing: 0,
    };

    for (const task of tasks) {
      switch (task.status) {
        case TaskStatus.COMPLETED:
          counts.completed++;
          break;
        case TaskStatus.FAILED:
          counts.failed++;
          break;
        case TaskStatus.PENDING:
          counts.pending++;
          break;
        case TaskStatus.PROCESSING:
          counts.processing++;
          break;
      }
    }

    return counts;
  }

  private calculateWorkflowGroupStatus(workflowTasks: any[]) {
    const completedTasks = workflowTasks.filter(
      (t) => t.status === TaskStatus.COMPLETED,
    ).length;
    const failedTasks = workflowTasks.filter(
      (t) => t.status === TaskStatus.FAILED,
    ).length;

    return {
      totalTasks: workflowTasks.length,
      completedTasks,
      failedTasks,
      isComplete: UtilsService.allItemsMeet(
        workflowTasks,
        (t) =>
          t.status === TaskStatus.COMPLETED || t.status === TaskStatus.FAILED,
      ),
    };
  }

  private calculateDelay(scheduledAt: string): number {
    const scheduledTime = new Date(scheduledAt).getTime();
    const now = Date.now();
    return Math.max(0, scheduledTime - now);
  }
}
