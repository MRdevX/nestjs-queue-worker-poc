import { Injectable, Logger } from '@nestjs/common';
import { TaskService } from '../task/task.service';
import { InvoiceCoordinatorService } from '../invoice/invoice-coordinator.service';
import { ITaskMessage } from '../core/messaging/types/task-message.interface';
import { UtilsService } from '../core/utils/utils.service';
import { TaskStatus } from '../task/types/task-status.enum';
import { TaskType } from '../task/types/task-type.enum';

@Injectable()
export class BaseWorker {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(
    protected readonly taskService: TaskService,
    protected readonly invoiceCoordinator: InvoiceCoordinatorService,
  ) {}

  async handleTask(data: ITaskMessage): Promise<void> {
    const { taskId, delay } = data;

    try {
      const task = await this.taskService.getTaskById(taskId);
      if (!task) {
        this.logger.warn(`Task ${taskId} not found`);
        return;
      }

      if (delay && delay > 0) {
        await UtilsService.sleep(delay);
      }

      await this.taskService.updateTaskStatus(taskId, TaskStatus.PROCESSING);
      await this.processTask(taskId);
      await this.taskService.updateTaskStatus(taskId, TaskStatus.COMPLETED);
      await this.handleWorkflowCoordination(taskId, task.type);

      this.logger.log(`Task completed: ${taskId}`);
    } catch (error) {
      this.logger.error(`Task failed: ${taskId}`, error.stack);
      await this.taskService.handleFailure(taskId, error);
      await this.handleWorkflowFailureCoordination(taskId, error);
    }
  }

  protected async processTask(taskId: string): Promise<void> {
    throw new Error('processTask must be implemented');
  }

  private async handleWorkflowCoordination(
    taskId: string,
    taskType: TaskType,
  ): Promise<void> {
    try {
      const invoiceTaskTypes = [
        TaskType.FETCH_ORDERS,
        TaskType.CREATE_INVOICE,
        TaskType.GENERATE_PDF,
        TaskType.SEND_EMAIL,
      ];

      if (invoiceTaskTypes.includes(taskType)) {
        await this.invoiceCoordinator.handleTaskCompletion(taskId);
      }
    } catch (error) {
      this.logger.warn(
        `Workflow coordination failed for task ${taskId}: ${error.message}`,
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
        const invoiceTaskTypes = [
          TaskType.FETCH_ORDERS,
          TaskType.CREATE_INVOICE,
          TaskType.GENERATE_PDF,
          TaskType.SEND_EMAIL,
        ];

        if (invoiceTaskTypes.includes(task.type)) {
          await this.invoiceCoordinator.handleTaskFailure(taskId, error);
        }
      }
    } catch (coordinatorError) {
      this.logger.warn(
        `Workflow failure coordination failed for task ${taskId}: ${coordinatorError.message}`,
      );
    }
  }
}
