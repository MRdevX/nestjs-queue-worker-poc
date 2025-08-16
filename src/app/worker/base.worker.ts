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
  }

  async handleTask(data: ITaskMessage) {
    const { taskId, delay, metadata } = data;

    this.logger.log(`[${this.constructor.name}] Processing task: ${taskId}`);

    try {
      const task = await this.taskService.getTaskById(taskId);
      if (!task) {
        this.logger.warn(`Task ${taskId} not found, skipping processing`);
        return;
      }

      if (!this.shouldProcessTaskType(task.type)) {
        this.logger.debug(
          `Worker ${this.constructor.name} skipping task ${taskId} of type ${task.type}`,
        );
        return;
      }

      if (delay && delay > 0) {
        this.logger.log(`Delaying task ${taskId} by ${delay}ms`);
        await UtilsService.sleep(delay);
      }

      await this.taskService.updateTaskStatus(taskId, TaskStatus.PROCESSING);

      await this.processTask(taskId);

      await this.taskService.updateTaskStatus(taskId, TaskStatus.COMPLETED);

      await this.handleWorkflowCoordination(taskId, task.type);

      this.logger.log(`Task completed successfully: ${taskId}`);
    } catch (error) {
      this.logger.error(`Task failed: ${taskId}`, error.stack);
      await this.taskService.handleFailure(taskId, error);
      await this.handleWorkflowFailureCoordination(taskId, error);
    }
  }

  protected abstract processTask(taskId: string): Promise<void>;

  protected abstract shouldProcessTaskType(taskType: TaskType): boolean;

  private async handleWorkflowCoordination(
    taskId: string,
    taskType: TaskType,
  ): Promise<void> {
    try {
      const coordinator = this.coordinatorFactory.getCoordinator(taskType);
      await coordinator.handleTaskCompletion(taskId);
    } catch (workflowError) {
      this.logger.warn(
        `Workflow handling failed for task ${taskId}: ${workflowError.message}`,
      );
    }
  }

  private async handleWorkflowFailureCoordination(
    taskId: string,
    error: Error,
  ): Promise<void> {
    try {
      const task = await this.taskService.getTaskById(taskId);
      if (task) {
        const coordinator = this.coordinatorFactory.getCoordinator(task.type);
        await coordinator.handleTaskFailure(taskId, error);
      }
    } catch (coordinatorError) {
      this.logger.warn(
        `Coordinator failure handling failed for task ${taskId}: ${coordinatorError.message}`,
      );
    }
  }
}
