import { Injectable, Logger } from '@nestjs/common';
import { TaskService } from '../task/task.service';
import { TaskType } from '../task/types/task-type.enum';
import { MessagingService } from '../core/messaging/messaging.service';
import { getWorkerForTaskType } from './config/queue.config';
import { IQueueStatus } from './types/queue.types';

@Injectable()
export class QueueManagerService {
  private readonly logger = new Logger(QueueManagerService.name);

  constructor(
    private readonly taskService: TaskService,
    private readonly messagingService: MessagingService,
  ) {}

  async enqueueTask(
    type: TaskType,
    payload: any,
    workflowId?: string,
  ): Promise<string> {
    try {
      const task = await this.taskService.createTask(type, payload, workflowId);
      this.logger.log(`Task ${task.id} created and queued for processing`);

      await this.messagingService.publishTask(task.type, task.id, {
        metadata: {
          workflowId,
          createdAt: new Date().toISOString(),
        },
      });

      this.logger.log(
        `Task ${task.id} published to queue: ${getWorkerForTaskType(type)}`,
      );
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

    if (task.retries >= 3) {
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

  async getQueueStatus(): Promise<IQueueStatus> {
    try {
      const [pending, processing, completed, failed] = await Promise.all([
        this.taskService.getPendingTasks(),
        this.taskService.findMany({ status: 'PROCESSING' }),
        this.taskService.findMany({ status: 'COMPLETED' }),
        this.taskService.findMany({ status: 'FAILED' }),
      ]);

      return {
        pending: pending.length,
        processing: processing.length,
        completed: completed.length,
        failed: failed.length,
        total:
          pending.length + processing.length + completed.length + failed.length,
        isHealthy: failed.length < 50 && pending.length < 500,
      };
    } catch (error) {
      this.logger.error('Error getting queue status', error.stack);
      return {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        total: 0,
        isHealthy: false,
      };
    }
  }
}
