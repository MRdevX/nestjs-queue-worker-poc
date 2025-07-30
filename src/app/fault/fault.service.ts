import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { MessagingService } from '../core/messaging/messaging.service';
import { TaskService } from '../task/task.service';
import { TaskType } from '../task/types/task-type.enum';

@Injectable()
export class FaultService {
  private readonly logger = new Logger(FaultService.name);

  constructor(
    private messagingService: MessagingService,
    private taskService: TaskService,
  ) {}

  async handleRetry(taskId: string): Promise<void> {
    if (!taskId) {
      throw new Error('Task ID is required');
    }

    try {
      const task = await this.taskService.getTaskById(taskId);
      if (!task) {
        throw new NotFoundException(`Task with id ${taskId} not found`);
      }

      const delay = Math.min(30000, 2000 * task.retries);

      this.logger.log(
        `Handling retry for task ${taskId} with delay ${delay}ms`,
      );

      await this.messagingService.publishTask(task.type, task.id, {
        delay,
        metadata: { retryCount: task.retries, isRetry: true },
      });

      this.logger.log(
        `Retry task published successfully: ${task.type} - ${taskId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle retry for task ${taskId}`,
        error.stack,
      );
      throw error;
    }
  }

  async handleCompensation(taskId: string): Promise<void> {
    if (!taskId) {
      throw new Error('Task ID is required');
    }

    try {
      const task = await this.taskService.getTaskById(taskId);
      if (!task) {
        throw new NotFoundException(`Task with id ${taskId} not found`);
      }

      this.logger.log(`Creating compensation task for failed task ${taskId}`);

      const compensationTask = await this.taskService.createTask(
        TaskType.COMPENSATION,
        { originalTaskId: taskId, originalTaskType: task.type },
        task.workflow?.id,
      );

      await this.messagingService.publishTask(
        compensationTask.type,
        compensationTask.id,
        {
          metadata: { originalTaskId: taskId, isCompensation: true },
        },
      );

      this.logger.log(
        `Compensation task created and published: ${compensationTask.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle compensation for task ${taskId}`,
        error.stack,
      );
      throw error;
    }
  }
}
