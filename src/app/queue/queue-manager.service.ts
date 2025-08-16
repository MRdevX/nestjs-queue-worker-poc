import { Injectable, Logger } from '@nestjs/common';
import { TaskService } from '../task/task.service';
import { TaskStatus } from '../task/types/task-status.enum';
import { TaskType } from '../task/types/task-type.enum';
import { TaskQueueService } from './task-queue.service';
import { IQueueStatus } from './types/queue.types';

@Injectable()
export class QueueManagerService {
  private readonly logger = new Logger(QueueManagerService.name);

  constructor(
    private readonly taskService: TaskService,
    private readonly taskQueueService: TaskQueueService,
  ) {}

  async enqueueTask(
    type: TaskType,
    payload: any,
    workflowId?: string,
  ): Promise<string> {
    return this.taskQueueService.enqueueTask(type, payload, workflowId);
  }

  async retryTask(taskId: string): Promise<void> {
    return this.taskQueueService.retryTask(taskId);
  }

  async getQueueStatus(): Promise<IQueueStatus> {
    try {
      const [pending, processing, completed, failed] = await Promise.all([
        this.taskService.getPendingTasks(),
        this.taskService.findTasks({ status: TaskStatus.PROCESSING }),
        this.taskService.findTasks({ status: TaskStatus.COMPLETED }),
        this.taskService.findTasks({ status: TaskStatus.FAILED }),
      ]);

      const total =
        pending.length + processing.length + completed.length + failed.length;
      const isHealthy = failed.length < 50 && pending.length < 500;

      return {
        pending: pending.length,
        processing: processing.length,
        completed: completed.length,
        failed: failed.length,
        total,
        isHealthy,
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
