import { Injectable, Logger } from '@nestjs/common';
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

  async startInvoiceWorkflow(
    dto: StartInvoiceWorkflowDto,
  ): Promise<InvoiceWorkflowResponseDto> {
    this.logger.log(
      `🚀 [START_INVOICE_WORKFLOW] Starting invoice workflow for customer: ${dto.customerId}`,
    );
    this.logger.log(
      `📅 [START_INVOICE_WORKFLOW] Date range: ${dto.dateFrom || 'N/A'} to ${dto.dateTo || 'N/A'}`,
    );
    this.logger.log(
      `🆔 [START_INVOICE_WORKFLOW] Workflow ID: ${dto.workflowId || 'auto-generated'}`,
    );

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

    this.logger.log(
      `✅ [START_INVOICE_WORKFLOW] FETCH_ORDERS task created with ID: ${task.id}`,
    );

    await this.messagingService.emitEvent('order.fetch', {
      taskId: task.id,
      taskType: task.type,
      customerId: dto.customerId,
      dateFrom: dto.dateFrom,
      dateTo: dto.dateTo,
    });

    this.logger.log(
      `📤 [START_INVOICE_WORKFLOW] FETCH_ORDERS task published to queue: ${task.id}`,
    );
    this.logger.log(INVOICE_LOG_MESSAGES.WORKFLOW_STARTED(task.id));

    const response = {
      message: INVOICE_MESSAGES.WORKFLOW_STARTED,
      taskId: task.id,
      workflowId: dto.workflowId,
    };

    this.logger.log(
      `🎯 [START_INVOICE_WORKFLOW] Workflow started successfully. Response: ${JSON.stringify(response)}`,
    );

    return response;
  }

  async createScheduledInvoiceWorkflow(
    dto: CreateScheduledInvoiceWorkflowDto,
  ): Promise<InvoiceWorkflowResponseDto> {
    this.logger.log(
      `⏰ [SCHEDULED_INVOICE_WORKFLOW] Creating scheduled invoice workflow for customer: ${dto.customerId}`,
    );
    this.logger.log(
      `📅 [SCHEDULED_INVOICE_WORKFLOW] Scheduled at: ${dto.scheduledAt}`,
    );
    this.logger.log(
      `📅 [SCHEDULED_INVOICE_WORKFLOW] Date range: ${dto.dateFrom || 'N/A'} to ${dto.dateTo || 'N/A'}`,
    );
    this.logger.log(
      `🆔 [SCHEDULED_INVOICE_WORKFLOW] Workflow ID: ${dto.workflowId || 'auto-generated'}`,
    );

    this.logger.log(
      INVOICE_LOG_MESSAGES.CREATING_SCHEDULED_WORKFLOW(dto.customerId),
    );

    const scheduledAt = UtilsService.validateAndParseDate(dto.scheduledAt);
    this.logger.log(
      `✅ [SCHEDULED_INVOICE_WORKFLOW] Date validation passed. Scheduled at: ${scheduledAt.toISOString()}`,
    );

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

    this.logger.log(
      `✅ [SCHEDULED_INVOICE_WORKFLOW] Scheduled task created with ID: ${task.id}`,
    );
    this.logger.log(INVOICE_LOG_MESSAGES.SCHEDULED_WORKFLOW_CREATED(task.id));

    const response = {
      message: INVOICE_MESSAGES.SCHEDULED_WORKFLOW_CREATED,
      taskId: task.id,
      scheduledAt: scheduledAt.toISOString(),
      workflowId: dto.workflowId,
    };

    this.logger.log(
      `🎯 [SCHEDULED_INVOICE_WORKFLOW] Scheduled workflow created successfully. Response: ${JSON.stringify(response)}`,
    );

    return response;
  }

  async createRecurringInvoiceWorkflow(
    dto: CreateRecurringInvoiceWorkflowDto,
  ): Promise<InvoiceWorkflowResponseDto> {
    this.logger.log(
      `🔄 [RECURRING_INVOICE_WORKFLOW] Creating recurring invoice workflow for customer: ${dto.customerId}`,
    );
    this.logger.log(
      `⏰ [RECURRING_INVOICE_WORKFLOW] Cron expression: ${dto.cronExpression}`,
    );
    this.logger.log(
      `📅 [RECURRING_INVOICE_WORKFLOW] Date range: ${dto.dateFrom || 'N/A'} to ${dto.dateTo || 'N/A'}`,
    );
    this.logger.log(
      `🆔 [RECURRING_INVOICE_WORKFLOW] Workflow ID: ${dto.workflowId || 'auto-generated'}`,
    );

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

    this.logger.log(
      `✅ [RECURRING_INVOICE_WORKFLOW] Recurring task created with ID: ${task.id}`,
    );
    this.logger.log(INVOICE_LOG_MESSAGES.RECURRING_WORKFLOW_CREATED(task.id));

    const response = {
      message: INVOICE_MESSAGES.RECURRING_WORKFLOW_CREATED,
      taskId: task.id,
      cronExpression: dto.cronExpression,
      workflowId: dto.workflowId,
    };

    this.logger.log(
      `🎯 [RECURRING_INVOICE_WORKFLOW] Recurring workflow created successfully. Response: ${JSON.stringify(response)}`,
    );

    return response;
  }

  async createScheduledEmailWorkflow(
    dto: CreateScheduledEmailWorkflowDto,
  ): Promise<InvoiceWorkflowResponseDto> {
    this.logger.log(
      `📧 [SCHEDULED_EMAIL_WORKFLOW] Creating scheduled email workflow for customer: ${dto.customerId}`,
    );
    this.logger.log(
      `🧾 [SCHEDULED_EMAIL_WORKFLOW] Invoice ID: ${dto.invoiceId}`,
    );
    this.logger.log(
      `⏰ [SCHEDULED_EMAIL_WORKFLOW] Scheduled at: ${dto.scheduledAt}`,
    );
    this.logger.log(
      `🆔 [SCHEDULED_EMAIL_WORKFLOW] Workflow ID: ${dto.workflowId || 'auto-generated'}`,
    );

    this.logger.log(
      INVOICE_LOG_MESSAGES.CREATING_SCHEDULED_EMAIL(dto.customerId),
    );

    const scheduledAt = UtilsService.validateAndParseDate(dto.scheduledAt);
    this.logger.log(
      `✅ [SCHEDULED_EMAIL_WORKFLOW] Date validation passed. Scheduled at: ${scheduledAt.toISOString()}`,
    );

    const task = await this.schedulerService.createScheduledTask(
      TaskType.SEND_EMAIL,
      {
        customerId: dto.customerId,
        invoiceId: dto.invoiceId,
      },
      scheduledAt,
      dto.workflowId,
    );

    this.logger.log(
      `✅ [SCHEDULED_EMAIL_WORKFLOW] Scheduled email task created with ID: ${task.id}`,
    );
    this.logger.log(INVOICE_LOG_MESSAGES.SCHEDULED_EMAIL_CREATED(task.id));

    const response = {
      message: INVOICE_MESSAGES.SCHEDULED_EMAIL_CREATED,
      taskId: task.id,
      scheduledAt: scheduledAt.toISOString(),
      workflowId: dto.workflowId,
    };

    this.logger.log(
      `🎯 [SCHEDULED_EMAIL_WORKFLOW] Scheduled email workflow created successfully. Response: ${JSON.stringify(response)}`,
    );

    return response;
  }

  async getCustomerInvoiceTasks(
    customerId: string,
  ): Promise<CustomerInvoiceTasksResponseDto> {
    this.logger.log(
      `📋 [GET_CUSTOMER_INVOICE_TASKS] Fetching invoice tasks for customer: ${customerId}`,
    );

    this.logger.log(INVOICE_LOG_MESSAGES.FETCHING_TASKS(customerId));

    const tasks = await this.taskService.findMany({
      payload: { customerId },
    });

    this.logger.log(
      `✅ [GET_CUSTOMER_INVOICE_TASKS] Found ${tasks.length} tasks for customer: ${customerId}`,
    );

    const response = {
      customerId,
      tasks: tasks.map((task) => TaskUtilsService.formatTask(task)),
    };

    this.logger.log(
      `🎯 [GET_CUSTOMER_INVOICE_TASKS] Returning ${response.tasks.length} formatted tasks for customer: ${customerId}`,
    );

    return response;
  }

  async getInvoiceWorkflowStatus(
    customerId: string,
  ): Promise<InvoiceWorkflowStatusResponseDto> {
    this.logger.log(
      `📊 [GET_INVOICE_WORKFLOW_STATUS] Fetching workflow status for customer: ${customerId}`,
    );

    this.logger.log(INVOICE_LOG_MESSAGES.FETCHING_STATUS(customerId));

    const tasks = await this.taskService.findMany({
      payload: { customerId },
    });

    this.logger.log(
      `✅ [GET_INVOICE_WORKFLOW_STATUS] Found ${tasks.length} tasks for customer: ${customerId}`,
    );

    const status = this.calculateWorkflowStatus(tasks, customerId);

    this.logger.log(
      INVOICE_LOG_MESSAGES.STATUS_CALCULATED(customerId, status.totalTasks),
    );

    this.logger.log(
      `📈 [GET_INVOICE_WORKFLOW_STATUS] Status breakdown - Total: ${status.totalTasks}, Completed: ${status.completedTasks}, Failed: ${status.failedTasks}, Pending: ${status.pendingTasks}, Processing: ${status.processingTasks}`,
    );
    this.logger.log(
      `🔄 [GET_INVOICE_WORKFLOW_STATUS] Workflows count: ${Object.keys(status.workflows).length}`,
    );

    Object.entries(status.workflows).forEach(([workflowId, workflowStatus]) => {
      this.logger.log(
        `   Workflow ${workflowId}: ${workflowStatus.totalTasks} tasks, ${workflowStatus.completedTasks} completed, ${workflowStatus.failedTasks} failed, Complete: ${workflowStatus.isComplete}`,
      );
    });

    this.logger.log(
      `🎯 [GET_INVOICE_WORKFLOW_STATUS] Workflow status calculated successfully for customer: ${customerId}`,
    );

    return status;
  }

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

    const workflowGroups = UtilsService.groupBy(
      tasks,
      (task) => task.workflow?.id || 'standalone',
    );

    for (const [workflowId, workflowTasks] of Object.entries(workflowGroups)) {
      status.workflows[workflowId] =
        this.calculateWorkflowGroupStatus(workflowTasks);
    }

    return status;
  }

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
