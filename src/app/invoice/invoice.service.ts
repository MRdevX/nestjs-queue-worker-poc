import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TaskService } from '../task/task.service';
import { MessagingService } from '../core/messaging/messaging.service';
import { SchedulerService } from '../scheduler/scheduler.service';
import { UtilsService } from '../core/utils/utils.service';
import { TaskUtilsService } from '../task/task.utils.service';
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
import {
  INVOICE_MESSAGES,
  INVOICE_LOG_MESSAGES,
} from './constants/invoice.constants';

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(
    private readonly taskService: TaskService,
    private readonly messagingService: MessagingService,
    private readonly schedulerService: SchedulerService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Start an invoice workflow for a customer
   */
  async startInvoiceWorkflow(
    dto: StartInvoiceWorkflowDto,
  ): Promise<InvoiceWorkflowResponseDto> {
    this.logger.log(INVOICE_LOG_MESSAGES.STARTING_WORKFLOW(dto.customerId));

    const task = await this.taskService.createTask(
      TaskType.FETCH_ORDERS,
      {
        customerId: dto.customerId,
        dateFrom: dto.dateFrom,
        dateTo: dto.dateTo,
      },
      dto.workflowId,
    );

    await this.messagingService.publishTask(task.type, task.id);

    this.logger.log(INVOICE_LOG_MESSAGES.WORKFLOW_STARTED(task.id));

    return {
      message: INVOICE_MESSAGES.WORKFLOW_STARTED,
      taskId: task.id,
      workflowId: dto.workflowId,
    };
  }

  /**
   * Create a scheduled invoice workflow
   */
  async createScheduledInvoiceWorkflow(
    dto: CreateScheduledInvoiceWorkflowDto,
  ): Promise<InvoiceWorkflowResponseDto> {
    this.logger.log(
      INVOICE_LOG_MESSAGES.CREATING_SCHEDULED_WORKFLOW(dto.customerId),
    );

    const scheduledAt = UtilsService.validateAndParseDate(dto.scheduledAt);

    const task = await this.schedulerService.createScheduledTask(
      TaskType.FETCH_ORDERS,
      {
        customerId: dto.customerId,
        dateFrom: dto.dateFrom,
        dateTo: dto.dateTo,
      },
      scheduledAt,
      dto.workflowId,
    );

    this.logger.log(INVOICE_LOG_MESSAGES.SCHEDULED_WORKFLOW_CREATED(task.id));

    return {
      message: INVOICE_MESSAGES.SCHEDULED_WORKFLOW_CREATED,
      taskId: task.id,
      scheduledAt: scheduledAt.toISOString(),
      workflowId: dto.workflowId,
    };
  }

  /**
   * Create a recurring invoice workflow
   */
  async createRecurringInvoiceWorkflow(
    dto: CreateRecurringInvoiceWorkflowDto,
  ): Promise<InvoiceWorkflowResponseDto> {
    this.logger.log(
      INVOICE_LOG_MESSAGES.CREATING_RECURRING_WORKFLOW(dto.customerId),
    );

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

    this.logger.log(INVOICE_LOG_MESSAGES.RECURRING_WORKFLOW_CREATED(task.id));

    return {
      message: INVOICE_MESSAGES.RECURRING_WORKFLOW_CREATED,
      taskId: task.id,
      cronExpression: dto.cronExpression,
      workflowId: dto.workflowId,
    };
  }

  /**
   * Create a scheduled email workflow
   */
  async createScheduledEmailWorkflow(
    dto: CreateScheduledEmailWorkflowDto,
  ): Promise<InvoiceWorkflowResponseDto> {
    this.logger.log(
      INVOICE_LOG_MESSAGES.CREATING_SCHEDULED_EMAIL(dto.customerId),
    );

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

    this.logger.log(INVOICE_LOG_MESSAGES.SCHEDULED_EMAIL_CREATED(task.id));

    return {
      message: INVOICE_MESSAGES.SCHEDULED_EMAIL_CREATED,
      taskId: task.id,
      scheduledAt: scheduledAt.toISOString(),
      workflowId: dto.workflowId,
    };
  }

  /**
   * Get all invoice tasks for a customer
   */
  async getCustomerInvoiceTasks(
    customerId: string,
  ): Promise<CustomerInvoiceTasksResponseDto> {
    this.logger.log(INVOICE_LOG_MESSAGES.FETCHING_TASKS(customerId));

    const tasks = await this.taskService.findMany({
      payload: { customerId },
    });

    return {
      customerId,
      tasks: tasks.map((task) => TaskUtilsService.formatTask(task)),
    };
  }

  /**
   * Get comprehensive workflow status for a customer
   */
  async getInvoiceWorkflowStatus(
    customerId: string,
  ): Promise<InvoiceWorkflowStatusResponseDto> {
    this.logger.log(INVOICE_LOG_MESSAGES.FETCHING_STATUS(customerId));

    const tasks = await this.taskService.findMany({
      payload: { customerId },
    });

    const status = this.calculateWorkflowStatus(tasks, customerId);

    this.logger.log(
      INVOICE_LOG_MESSAGES.STATUS_CALCULATED(customerId, status.totalTasks),
    );

    return status;
  }

  /**
   * Calculate comprehensive workflow status from tasks
   */
  private calculateWorkflowStatus(
    tasks: any[],
    customerId: string,
  ): InvoiceWorkflowStatusResponseDto {
    const statusCounts = TaskUtilsService.countTasksByStatus(tasks);
    const status: InvoiceWorkflowStatusResponseDto = {
      customerId,
      totalTasks: statusCounts.total,
      completedTasks: statusCounts.completed,
      failedTasks: statusCounts.failed,
      pendingTasks: statusCounts.pending,
      processingTasks: statusCounts.processing,
      workflows: {},
    };

    // Group tasks by workflow
    const workflowGroups = UtilsService.groupBy(
      tasks,
      (task) => task.workflow?.id || 'standalone',
    );

    // Calculate status for each workflow
    for (const [workflowId, workflowTasks] of Object.entries(workflowGroups)) {
      status.workflows[workflowId] =
        this.calculateWorkflowGroupStatus(workflowTasks);
    }

    return status;
  }

  /**
   * Calculate status for a group of workflow tasks
   */
  private calculateWorkflowGroupStatus(workflowTasks: any[]): {
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    isComplete: boolean;
  } {
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
}
