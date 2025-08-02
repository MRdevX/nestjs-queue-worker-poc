import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TaskService } from '../task/task.service';
import { MessagingService } from '../core/messaging/messaging.service';
import { TaskType } from '../task/types/task-type.enum';
import {
  INVOICE_ERROR_MESSAGES,
  INVOICE_LOG_MESSAGES,
} from './constants/invoice.constants';

@Injectable()
export class InvoiceWorkflowService {
  private readonly logger = new Logger(InvoiceWorkflowService.name);

  constructor(
    private readonly taskService: TaskService,
    private readonly messagingService: MessagingService,
    private readonly configService: ConfigService,
  ) {}

  async handleFetchOrdersCompletion(taskId: string) {
    const task = await this.taskService.getTaskById(taskId);
    if (!task) {
      throw new Error(INVOICE_ERROR_MESSAGES.TASK_NOT_FOUND(taskId));
    }

    const { customerId, orders } = task.payload;

    if (!orders || orders.length === 0) {
      this.logger.log(INVOICE_LOG_MESSAGES.NO_DELIVERABLE_ORDERS(customerId));
      return;
    }

    // Create invoice creation task
    const createInvoiceTask = await this.taskService.createTask(
      TaskType.CREATE_INVOICE,
      {
        customerId,
        orders,
      },
      task.workflow?.id,
    );

    await this.messagingService.publishTask(
      createInvoiceTask.type,
      createInvoiceTask.id,
    );
    this.logger.log(
      INVOICE_LOG_MESSAGES.INVOICE_TASK_CREATED(
        createInvoiceTask.id,
        customerId,
      ),
    );
  }

  async handleCreateInvoiceCompletion(taskId: string) {
    const task = await this.taskService.getTaskById(taskId);
    if (!task) {
      throw new Error(INVOICE_ERROR_MESSAGES.TASK_NOT_FOUND(taskId));
    }

    const { customerId, invoice } = task.payload;

    if (!invoice) {
      throw new Error(INVOICE_ERROR_MESSAGES.INVOICE_DATA_NOT_FOUND);
    }

    // Create PDF generation task
    const generatePdfTask = await this.taskService.createTask(
      TaskType.GENERATE_PDF,
      {
        customerId,
        invoice,
        pdfProcessorUrl:
          task.payload.pdfProcessorUrl ||
          this.configService.get('invoice.pdfProcessor.url'),
      },
      task.workflow?.id,
    );

    await this.messagingService.publishTask(
      generatePdfTask.type,
      generatePdfTask.id,
    );
    this.logger.log(
      INVOICE_LOG_MESSAGES.PDF_TASK_CREATED(generatePdfTask.id, invoice.id),
    );
  }

  async handleGeneratePdfCompletion(taskId: string) {
    const task = await this.taskService.getTaskById(taskId);
    if (!task) {
      throw new Error(INVOICE_ERROR_MESSAGES.TASK_NOT_FOUND(taskId));
    }

    const { customerId, invoice, pdfUrl } = task.payload;

    if (!pdfUrl) {
      throw new Error(INVOICE_ERROR_MESSAGES.PDF_URL_NOT_FOUND);
    }

    // Create email sending task
    const sendEmailTask = await this.taskService.createTask(
      TaskType.SEND_EMAIL,
      {
        customerId,
        invoice,
        pdfUrl,
        emailServiceUrl:
          task.payload.emailServiceUrl ||
          this.configService.get('invoice.emailService.url'),
      },
      task.workflow?.id,
    );

    await this.messagingService.publishTask(
      sendEmailTask.type,
      sendEmailTask.id,
    );
    this.logger.log(
      INVOICE_LOG_MESSAGES.EMAIL_TASK_CREATED(sendEmailTask.id, customerId),
    );
  }

  async handleSendEmailCompletion(taskId: string) {
    const task = await this.taskService.getTaskById(taskId);
    if (!task) {
      throw new Error(INVOICE_ERROR_MESSAGES.TASK_NOT_FOUND(taskId));
    }

    const { customerId, invoice } = task.payload;

    this.logger.log(
      INVOICE_LOG_MESSAGES.WORKFLOW_COMPLETED(customerId, invoice?.id),
    );

    // In a real implementation, you might want to:
    // 1. Update the orders as invoiced in the Ninox database
    // 2. Send notifications to the business
    // 3. Update workflow status
  }

  async handleTaskFailure(taskId: string, error: Error) {
    const task = await this.taskService.getTaskById(taskId);
    if (!task) {
      throw new Error(INVOICE_ERROR_MESSAGES.TASK_NOT_FOUND(taskId));
    }

    this.logger.error(INVOICE_LOG_MESSAGES.TASK_FAILED(taskId), error.stack);

    // Create compensation task for failed invoice workflow
    const compensationTask = await this.taskService.createTask(
      TaskType.COMPENSATION,
      {
        originalTaskId: taskId,
        originalTaskType: task.type,
        customerId: task.payload.customerId,
        reason: error.message,
      },
      task.workflow?.id,
    );

    await this.messagingService.publishTask(
      compensationTask.type,
      compensationTask.id,
    );
    this.logger.log(
      INVOICE_LOG_MESSAGES.COMPENSATION_TASK_CREATED(
        compensationTask.id,
        taskId,
      ),
    );
  }
}
