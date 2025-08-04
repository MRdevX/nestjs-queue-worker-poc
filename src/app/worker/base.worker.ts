import { Injectable, Logger } from '@nestjs/common';
import { TaskService } from '../task/task.service';
import { CoordinatorFactoryService } from '../workflow/coordinator-factory.service';
import { ITaskMessage } from '../core/messaging/types/task-message.interface';
import { UtilsService } from '../core/utils/utils.service';
import { TaskStatus } from '../task/types/task-status.enum';
import { TaskType } from '../task/types/task-type.enum';

@Injectable()
export abstract class BaseWorker {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(
    protected readonly taskService: TaskService,
    protected readonly coordinatorFactory: CoordinatorFactoryService,
  ) {
    this.logger.log(`${this.constructor.name} initialized`);
    this.logger.log(`${this.constructor.name} listening for events`);
  }

  async handleTask(data: ITaskMessage) {
    this.logger.log(
      `[${this.constructor.name}] Received task message: ${JSON.stringify(data)}`,
    );

    const { taskId, delay, metadata } = data;

    try {
      const task = await this.taskService.getTaskById(taskId);
      if (!task) {
        this.logger.warn(`Task ${taskId} not found, skipping processing`);
        return;
      }

      this.logger.log(
        `Found task: ${taskId}, type: ${task.type}, status: ${task.status}`,
      );

      if (!this.shouldProcessTaskType(task.type)) {
        this.logger.debug(
          `Worker ${this.constructor.name} skipping task ${taskId} of type ${task.type}`,
        );
        return;
      }

      this.logger.log(
        `Worker ${this.constructor.name} will process task ${taskId} of type ${task.type}`,
      );

      if (delay && delay > 0) {
        this.logger.log(`Delaying task ${taskId} by ${delay}ms`);
        await UtilsService.sleep(delay);
      }

      this.logger.log(
        `Processing task: ${taskId} (${task.type})${metadata ? ` with metadata: ${JSON.stringify(metadata)}` : ''}`,
      );

      await this.taskService.updateTaskStatus(taskId, TaskStatus.PROCESSING);

      await this.processTask(taskId);

      await this.taskService.updateTaskStatus(taskId, TaskStatus.COMPLETED);

      try {
        const coordinator = this.coordinatorFactory.getCoordinator(task.type);
        await coordinator.handleTaskCompletion(taskId);
      } catch (workflowError) {
        this.logger.warn(
          `Workflow handling failed for task ${taskId}: ${workflowError.message}`,
        );
      }

      this.logger.log(`Task completed successfully: ${taskId}`);
    } catch (error) {
      this.logger.error(`Task failed: ${taskId}`, error.stack);
      await this.taskService.handleFailure(taskId, error);

      try {
        const failedTask = await this.taskService.getTaskById(taskId);
        if (failedTask) {
          const coordinator = this.coordinatorFactory.getCoordinator(
            failedTask.type,
          );
          await coordinator.handleTaskFailure(taskId, error);
        }
      } catch (coordinatorError) {
        this.logger.warn(
          `Coordinator failure handling failed for task ${taskId}: ${coordinatorError.message}`,
        );
      }
    }
  }

  protected abstract processTask(taskId: string): Promise<void>;

  protected abstract shouldProcessTaskType(taskType: TaskType): boolean;
}
