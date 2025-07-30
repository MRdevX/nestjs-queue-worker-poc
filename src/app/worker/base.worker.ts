import { Injectable, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { MessagingService } from '../core/messaging/messaging.service';
import { TaskService } from '../task/task.service';
import { CoordinatorService } from '../workflow/coordinator.service';

@Injectable()
export abstract class BaseWorker {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(
    protected readonly taskService: TaskService,
    protected readonly coordinator: CoordinatorService,
    protected readonly messagingService: MessagingService,
  ) {}

  @EventPattern('task.created')
  async handleTask(@Payload() data: { taskType: string; taskId: string }) {
    const { taskId } = data;

    try {
      this.logger.log(`Processing task: ${taskId}`);
      await this.processTask(taskId);
      await this.coordinator.handleTaskCompletion(taskId);
      this.logger.log(`Task completed successfully: ${taskId}`);
    } catch (error) {
      this.logger.error(`Task failed: ${taskId}`, error.stack);
      await this.taskService.handleFailure(taskId, error);
    }
  }

  protected abstract processTask(taskId: string): Promise<void>;
}
