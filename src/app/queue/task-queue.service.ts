import { Injectable, Logger } from '@nestjs/common';
import { TaskService } from '../task/task.service';
import { MessagingService } from '../core/messaging/messaging.service';
import { TaskType } from '../task/types/task-type.enum';

@Injectable()
export class TaskQueueService {
  private readonly logger = new Logger(TaskQueueService.name);

  constructor(
    private readonly taskService: TaskService,
    private readonly messagingService: MessagingService,
  ) {}

  async enqueueTask(
    type: TaskType,
    payload: any,
    workflowId?: string,
    options?: { delay?: number; metadata?: Record<string, any> },
  ): Promise<string> {
    try {
      const task = await this.taskService.createTask(type, payload, workflowId);
      this.logger.log(`Task ${task.id} created and queued for processing`);

      await this.messagingService.publishTask(task.type, task.id, {
        delay: options?.delay,
        metadata: {
          workflowId,
          createdAt: new Date().toISOString(),
          ...options?.metadata,
        },
      });

      this.logger.log(`Task ${task.id} published to queue`);
      return task.id;
    } catch (error) {
      this.logger.error('Failed to enqueue task', error.stack);
      throw error;
    }
  }

  async retryTask(taskId: string): Promise<void> {
    const task = await this.taskService.getTaskById(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    if (task.retries >= task.maxRetries) {
      this.logger.warn(`Task ${taskId} has exceeded max retries`);
      return;
    }

    await this.messagingService.publishTask(task.type, task.id, {
      metadata: {
        retryCount: task.retries + 1,
        originalTaskId: taskId,
      },
    });

    this.logger.log(`Retrying task ${taskId}`);
  }
}
