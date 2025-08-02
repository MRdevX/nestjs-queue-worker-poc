import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { TaskService } from '../task/task.service';
import { MessagingService } from '../core/messaging/messaging.service';
import { SchedulerService } from '../scheduler/scheduler.service';
import { TaskType } from '../task/types/task-type.enum';

@Controller('invoice')
export class InvoiceController {
  constructor(
    private readonly taskService: TaskService,
    private readonly messagingService: MessagingService,
    private readonly schedulerService: SchedulerService,
  ) {}

  @Post('workflow/start')
  async startInvoiceWorkflow(
    @Body()
    dto: {
      customerId: string;
      dateFrom?: string;
      dateTo?: string;
      workflowId?: string;
    },
  ) {
    // Create the initial task to fetch orders
    const task = await this.taskService.createTask(
      TaskType.FETCH_ORDERS,
      {
        customerId: dto.customerId,
        dateFrom: dto.dateFrom,
        dateTo: dto.dateTo,
      },
      dto.workflowId,
    );

    // Publish the task to the queue
    await this.messagingService.publishTask(task.type, task.id);

    return {
      message: 'Invoice workflow started',
      taskId: task.id,
      workflowId: dto.workflowId,
    };
  }

  @Post('workflow/scheduled')
  async createScheduledInvoiceWorkflow(
    @Body()
    dto: {
      customerId: string;
      scheduledAt: string;
      dateFrom?: string;
      dateTo?: string;
      workflowId?: string;
    },
  ) {
    const scheduledAt = new Date(dto.scheduledAt);

    if (isNaN(scheduledAt.getTime())) {
      throw new Error('Invalid scheduledAt date');
    }

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

    return {
      message: 'Scheduled invoice workflow created',
      taskId: task.id,
      scheduledAt: scheduledAt.toISOString(),
      workflowId: dto.workflowId,
    };
  }

  @Post('workflow/recurring')
  async createRecurringInvoiceWorkflow(
    @Body()
    dto: {
      customerId: string;
      cronExpression: string;
      dateFrom?: string;
      dateTo?: string;
      workflowId?: string;
    },
  ) {
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

  @Post('email/scheduled')
  async createScheduledEmailWorkflow(
    @Body()
    dto: {
      customerId: string;
      invoiceId: string;
      scheduledAt: string;
      workflowId?: string;
    },
  ) {
    const scheduledAt = new Date(dto.scheduledAt);

    if (isNaN(scheduledAt.getTime())) {
      throw new Error('Invalid scheduledAt date');
    }

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

  @Get('tasks/:customerId')
  async getCustomerInvoiceTasks(@Param('customerId') customerId: string) {
    const tasks = await this.taskService.findMany({
      payload: { customerId },
    });

    return {
      customerId,
      tasks: tasks.map((task) => ({
        id: task.id,
        type: task.type,
        status: task.status,
        createdAt: task.createdAt,
        completedAt: task.status === 'completed' ? task.updatedAt : null,
      })),
    };
  }

  @Get('status/:customerId')
  async getInvoiceWorkflowStatus(@Param('customerId') customerId: string) {
    const tasks = await this.taskService.findMany({
      payload: { customerId },
    });

    const status = {
      customerId,
      totalTasks: tasks.length,
      completedTasks: tasks.filter((t) => t.status === 'completed').length,
      failedTasks: tasks.filter((t) => t.status === 'failed').length,
      pendingTasks: tasks.filter((t) => t.status === 'pending').length,
      processingTasks: tasks.filter((t) => t.status === 'processing').length,
      workflows: {},
    };

    // Group by workflow
    const workflowGroups = tasks.reduce(
      (acc, task) => {
        const workflowId = task.workflow?.id || 'standalone';
        if (!acc[workflowId]) {
          acc[workflowId] = [];
        }
        acc[workflowId].push(task);
        return acc;
      },
      {} as Record<string, typeof tasks>,
    );

    for (const [workflowId, workflowTasks] of Object.entries(workflowGroups)) {
      status.workflows[workflowId] = {
        totalTasks: workflowTasks.length,
        completedTasks: workflowTasks.filter((t) => t.status === 'completed')
          .length,
        failedTasks: workflowTasks.filter((t) => t.status === 'failed').length,
        isComplete: workflowTasks.every(
          (t) => t.status === 'completed' || t.status === 'failed',
        ),
      };
    }

    return status;
  }
}
