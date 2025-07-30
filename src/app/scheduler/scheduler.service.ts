import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TaskService } from '../task/task.service';
import { MessagingService } from '../core/messaging/messaging.service';
import { TaskType } from '../task/types/task-type.enum';
import { TaskRepository } from '../task/task.repository';
import { TaskStatus } from '../task/types/task-status.enum';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly taskService: TaskService,
    private readonly messagingService: MessagingService,
    private readonly taskRepository: TaskRepository,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledTasks() {
    this.logger.debug('Processing scheduled tasks...');

    try {
      const scheduledTasks = await this.taskRepository.findScheduledTasks();

      for (const task of scheduledTasks) {
        if (this.shouldExecuteTask(task)) {
          await this.executeScheduledTask(task);
        }
      }
    } catch (error) {
      this.logger.error('Error processing scheduled tasks', error.stack);
    }
  }

  async createScheduledTask(
    type: TaskType,
    payload: any,
    scheduledAt: Date,
    workflowId?: string,
  ) {
    const task = await this.taskService.createTask(type, payload, workflowId);

    await this.taskRepository.update(task.id, { scheduledAt });

    this.logger.log(
      `Scheduled task created: ${task.id} for ${scheduledAt.toISOString()}`,
    );

    return task;
  }

  async createRecurringTask(
    type: TaskType,
    payload: any,
    cronExpression: string,
    workflowId?: string,
  ) {
    const task = await this.taskService.createTask(type, payload, workflowId);

    await this.taskRepository.update(task.id, {
      payload: { ...payload, cronExpression, isRecurring: true },
    });

    this.logger.log(
      `Recurring task created: ${task.id} with cron: ${cronExpression}`,
    );

    return task;
  }

  async getScheduledTasks() {
    return this.taskRepository.findScheduledTasks();
  }

  private shouldExecuteTask(task: any): boolean {
    const now = new Date();
    return task.scheduledAt && task.scheduledAt <= now;
  }

  private async executeScheduledTask(task: any) {
    try {
      this.logger.log(`Executing scheduled task: ${task.id}`);

      await this.taskRepository.update(task.id, {
        status: TaskStatus.PENDING,
        scheduledAt: null,
      });

      await this.messagingService.publishTask(task.type, task.id);

      this.logger.log(`Scheduled task queued: ${task.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to execute scheduled task: ${task.id}`,
        error.stack,
      );
    }
  }
}
