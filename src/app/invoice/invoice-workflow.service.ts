import { Injectable, Logger } from '@nestjs/common';
import { TaskService } from '../task/task.service';
import { MessagingService } from '../core/messaging/messaging.service';
import { TaskType } from '../task/types/task-type.enum';

@Injectable()
export class InvoiceWorkflowService {
  private readonly logger = new Logger(InvoiceWorkflowService.name);

  constructor(
    private readonly taskService: TaskService,
    private readonly messagingService: MessagingService,
  ) {}

  async handleFetchOrdersCompletion(taskId: string) {
    const task = await this.taskService.getTaskById(taskId);
    if (!task) {
      throw new Error(`Task with id ${taskId} not found`);
    }

    const { customerId, orders } = task.payload;

    if (!orders || orders.length === 0) {
      this.logger.log(`No deliverable orders found for customer ${customerId}`);
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
      `Created invoice task ${createInvoiceTask.id} for customer ${customerId}`,
    );
  }

  async handleCreateInvoiceCompletion(taskId: string) {
    const task = await this.taskService.getTaskById(taskId);
    if (!task) {
      throw new Error(`Task with id ${taskId} not found`);
    }

    const { customerId, invoice } = task.payload;

    if (!invoice) {
      throw new Error('Invoice data not found in task payload');
    }

    // Create PDF generation task
    const generatePdfTask = await this.taskService.createTask(
      TaskType.GENERATE_PDF,
      {
        customerId,
        invoice,
        pdfProcessorUrl:
          task.payload.pdfProcessorUrl ||
          process.env.PDF_PROCESSOR_URL ||
          'https://mock-pdf-processor.com/generate',
      },
      task.workflow?.id,
    );

    await this.messagingService.publishTask(
      generatePdfTask.type,
      generatePdfTask.id,
    );
    this.logger.log(
      `Created PDF generation task ${generatePdfTask.id} for invoice ${invoice.id}`,
    );
  }

  async handleGeneratePdfCompletion(taskId: string) {
    const task = await this.taskService.getTaskById(taskId);
    if (!task) {
      throw new Error(`Task with id ${taskId} not found`);
    }

    const { customerId, invoice, pdfUrl } = task.payload;

    if (!pdfUrl) {
      throw new Error('PDF URL not found in task payload');
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
          process.env.EMAIL_SERVICE_URL ||
          'https://mock-email-service.com/send',
      },
      task.workflow?.id,
    );

    await this.messagingService.publishTask(
      sendEmailTask.type,
      sendEmailTask.id,
    );
    this.logger.log(
      `Created email sending task ${sendEmailTask.id} for customer ${customerId}`,
    );
  }

  async handleSendEmailCompletion(taskId: string) {
    const task = await this.taskService.getTaskById(taskId);
    if (!task) {
      throw new Error(`Task with id ${taskId} not found`);
    }

    const { customerId, invoice } = task.payload;

    this.logger.log(
      `Invoice workflow completed for customer ${customerId}, invoice ${invoice?.id}`,
    );

    // In a real implementation, you might want to:
    // 1. Update the orders as invoiced in the Ninox database
    // 2. Send notifications to the business
    // 3. Update workflow status
  }

  async handleTaskFailure(taskId: string, error: Error) {
    const task = await this.taskService.getTaskById(taskId);
    if (!task) {
      throw new Error(`Task with id ${taskId} not found`);
    }

    this.logger.error(`Invoice workflow task failed: ${taskId}`, error.stack);

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
      `Created compensation task ${compensationTask.id} for failed task ${taskId}`,
    );
  }
}
