import { Injectable, Logger } from '@nestjs/common';
import { TaskService } from '../task/task.service';
import { MessagingService } from '../core/messaging/messaging.service';
import { TaskType } from '../task/types/task-type.enum';
import { InvoiceWorkflowService } from './invoice-workflow.service';

@Injectable()
export class InvoiceCoordinatorService {
  private readonly logger = new Logger(InvoiceCoordinatorService.name);

  constructor(
    private readonly taskService: TaskService,
    private readonly messagingService: MessagingService,
    private readonly invoiceWorkflowService: InvoiceWorkflowService,
  ) {}

  async handleTaskCompletion(taskId: string) {
    try {
      const task = await this.taskService.getTaskById(taskId);
      if (!task) {
        this.logger.error(`Task not found: ${taskId}`);
        return;
      }

      this.logger.log(
        `Handling task completion for ${taskId} of type ${task.type}`,
      );

      switch (task.type) {
        case TaskType.FETCH_ORDERS:
          await this.invoiceWorkflowService.handleFetchOrdersCompletion(taskId);
          break;
        case TaskType.CREATE_INVOICE:
          await this.invoiceWorkflowService.handleCreateInvoiceCompletion(
            taskId,
          );
          break;
        case TaskType.GENERATE_PDF:
          await this.invoiceWorkflowService.handleGeneratePdfCompletion(taskId);
          break;
        case TaskType.SEND_EMAIL:
          await this.invoiceWorkflowService.handleSendEmailCompletion(taskId);
          break;
        default:
          this.logger.debug(
            `No specific handling for task type ${task.type}, task ${taskId} completed`,
          );
      }
    } catch (error) {
      this.logger.error(
        `Failed to handle task completion for ${taskId}:`,
        error.stack,
      );
      throw error;
    }
  }

  async handleTaskFailure(taskId: string, error: Error) {
    try {
      const task = await this.taskService.getTaskById(taskId);
      if (!task) {
        this.logger.error(`Task not found: ${taskId}`);
        return;
      }

      this.logger.log(
        `Handling task failure for ${taskId} of type ${task.type}`,
      );

      await this.invoiceWorkflowService.handleTaskFailure(taskId, error);
    } catch (coordinatorError) {
      this.logger.error(
        `Failed to handle task failure for ${taskId}:`,
        coordinatorError.stack,
      );
      throw coordinatorError;
    }
  }
}
