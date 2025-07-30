import { Injectable, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { MessagingService } from '../core/messaging/messaging.service';
import { TaskService } from '../task/task.service';
import { CoordinatorService } from '../workflow/coordinator.service';
import { ITaskMessage } from '../core/messaging/types/task-message.interface';
import { UtilsService } from '../core/utils/utils.service';
import { TaskStatus } from '../task/types/task-status.enum';

@Injectable()
export abstract class BaseWorker {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(
    protected readonly taskService: TaskService,
    protected readonly coordinator: CoordinatorService,
    protected readonly messagingService: MessagingService,
  ) {}

  @EventPattern('task.created')
  async handleTask(@Payload() data: ITaskMessage) {
    const { taskId, delay, metadata } = data;

    try {
      if (delay && delay > 0) {
        this.logger.log(`Delaying task ${taskId} by ${delay}ms`);
        await UtilsService.sleep(delay);
      }

      this.logger.log(
        `Processing task: ${taskId}${metadata ? ` with metadata: ${JSON.stringify(metadata)}` : ''}`,
      );

      await this.taskService.updateTaskStatus(taskId, TaskStatus.PROCESSING);

      await this.processTask(taskId);

      await this.taskService.updateTaskStatus(taskId, TaskStatus.COMPLETED);

      try {
        await this.coordinator.handleTaskCompletion(taskId);
      } catch (workflowError) {
        this.logger.warn(
          `Workflow handling failed for task ${taskId}: ${workflowError.message}`,
        );
      }

      this.logger.log(`Task completed successfully: ${taskId}`);
    } catch (error) {
      this.logger.error(`Task failed: ${taskId}`, error.stack);
      await this.taskService.handleFailure(taskId, error);
    }
  }

  protected abstract processTask(taskId: string): Promise<void>;
}
