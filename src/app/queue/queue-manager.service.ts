import { Injectable, Logger } from '@nestjs/common';
import { TaskService } from '../task/task.service';
import { TaskStatus } from '../task/types/task-status.enum';
import { IQueueStatus } from './types/queue-status.interface';

@Injectable()
export class QueueManagerService {
  private readonly logger = new Logger(QueueManagerService.name);

  constructor(private readonly taskService: TaskService) {}

  async getQueueStatus(): Promise<IQueueStatus> {
    try {
      const [pending, processing, completed, failed] = await Promise.all([
        this.taskService.getPendingTasks(),
        this.taskService.findMany({ status: TaskStatus.PROCESSING }),
        this.taskService.findMany({ status: TaskStatus.COMPLETED }),
        this.taskService.findMany({ status: TaskStatus.FAILED }),
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

  async isOverloaded(): Promise<boolean> {
    const status = await this.getQueueStatus();
    return status.pending > 200 || status.failed > 20;
  }

  async getFailedTasksCount(): Promise<number> {
    const failedTasks = await this.taskService.findMany({
      status: TaskStatus.FAILED,
    });
    return failedTasks.length;
  }

  async getPendingTasksCount(): Promise<number> {
    const pendingTasks = await this.taskService.getPendingTasks();
    return pendingTasks.length;
  }
}
