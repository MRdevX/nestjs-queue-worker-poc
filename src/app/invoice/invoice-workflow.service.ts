import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TaskService } from '../task/task.service';
import { MessagingService } from '../core/messaging/services/messaging.service';
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
    this.logger.log(
      `🔄 [FETCH_ORDERS_COMPLETION] Starting to handle fetch orders completion for task: ${taskId}`,
    );

    const task = await this.taskService.getTaskById(taskId);
    if (!task) {
      this.logger.error(
        `❌ [FETCH_ORDERS_COMPLETION] Task not found: ${taskId}`,
      );
      throw new Error(INVOICE_ERROR_MESSAGES.TASK_NOT_FOUND(taskId));
    }

    this.logger.log(
      `📋 [FETCH_ORDERS_COMPLETION] Task found - Type: ${task.type}, Status: ${task.status}, Workflow: ${task.workflow?.id || 'standalone'}`,
    );

    const { customerId, orders } = task.payload;
    this.logger.log(
      `👤 [FETCH_ORDERS_COMPLETION] Customer ID: ${customerId}, Orders count: ${orders?.length || 0}`,
    );

    if (!orders || orders.length === 0) {
      this.logger.log(INVOICE_LOG_MESSAGES.NO_DELIVERABLE_ORDERS(customerId));
      this.logger.log(
        `⏹️ [FETCH_ORDERS_COMPLETION] No orders to process, workflow ending for customer: ${customerId}`,
      );
      return;
    }

    this.logger.log(
      `📦 [FETCH_ORDERS_COMPLETION] Processing ${orders.length} orders for customer: ${customerId}`,
    );
    orders.forEach((order, index) => {
      this.logger.log(
        `   Order ${index + 1}: ID=${order.id}, Status=${order.status}, Amount=${order.totalAmount}, DeliveryDate=${order.deliveryDate}`,
      );
    });

    this.logger.log(
      `🔄 [FETCH_ORDERS_COMPLETION] Creating CREATE_INVOICE task for customer: ${customerId}`,
    );
    const createInvoiceTask = await this.taskService.createTask(
      TaskType.CREATE_INVOICE,
      {
        customerId,
        orders,
      },
      task.workflow?.id,
    );

    this.logger.log(
      `✅ [FETCH_ORDERS_COMPLETION] CREATE_INVOICE task created with ID: ${createInvoiceTask.id}`,
    );

    await this.messagingService.publishTask(
      createInvoiceTask.type,
      createInvoiceTask.id,
    );

    this.logger.log(
      `📤 [FETCH_ORDERS_COMPLETION] CREATE_INVOICE task published to queue: ${createInvoiceTask.id}`,
    );
    this.logger.log(
      INVOICE_LOG_MESSAGES.INVOICE_TASK_CREATED(
        createInvoiceTask.id,
        customerId,
      ),
    );

    this.logger.log(
      `✅ [FETCH_ORDERS_COMPLETION] Successfully completed fetch orders workflow step for customer: ${customerId}`,
    );
  }

  async handleCreateInvoiceCompletion(taskId: string) {
    this.logger.log(
      `🔄 [CREATE_INVOICE_COMPLETION] Starting to handle create invoice completion for task: ${taskId}`,
    );

    const task = await this.taskService.getTaskById(taskId);
    if (!task) {
      this.logger.error(
        `❌ [CREATE_INVOICE_COMPLETION] Task not found: ${taskId}`,
      );
      throw new Error(INVOICE_ERROR_MESSAGES.TASK_NOT_FOUND(taskId));
    }

    this.logger.log(
      `📋 [CREATE_INVOICE_COMPLETION] Task found - Type: ${task.type}, Status: ${task.status}, Workflow: ${task.workflow?.id || 'standalone'}`,
    );

    const { customerId, invoice } = task.payload;
    this.logger.log(
      `👤 [CREATE_INVOICE_COMPLETION] Customer ID: ${customerId}`,
    );

    if (!invoice) {
      this.logger.error(
        `❌ [CREATE_INVOICE_COMPLETION] Invoice data not found in task payload for task: ${taskId}`,
      );
      throw new Error(INVOICE_ERROR_MESSAGES.INVOICE_DATA_NOT_FOUND);
    }

    this.logger.log(
      `🧾 [CREATE_INVOICE_COMPLETION] Invoice created successfully - ID: ${invoice.id}, Number: ${invoice.invoiceNumber}, Amount: ${invoice.totalAmount}, Grand Total: ${invoice.grandTotal}`,
    );

    const pdfProcessorUrl =
      task.payload.pdfProcessorUrl ||
      this.configService.get('invoice.pdfProcessor.url');

    this.logger.log(
      `🔄 [CREATE_INVOICE_COMPLETION] Creating GENERATE_PDF task for invoice: ${invoice.id}`,
    );
    this.logger.log(
      `🔗 [CREATE_INVOICE_COMPLETION] Using PDF processor URL: ${pdfProcessorUrl}`,
    );

    const generatePdfTask = await this.taskService.createTask(
      TaskType.GENERATE_PDF,
      {
        customerId,
        invoice,
        pdfProcessorUrl,
      },
      task.workflow?.id,
    );

    this.logger.log(
      `✅ [CREATE_INVOICE_COMPLETION] GENERATE_PDF task created with ID: ${generatePdfTask.id}`,
    );

    await this.messagingService.publishTask(
      generatePdfTask.type,
      generatePdfTask.id,
    );

    this.logger.log(
      `📤 [CREATE_INVOICE_COMPLETION] GENERATE_PDF task published to queue: ${generatePdfTask.id}`,
    );
    this.logger.log(
      INVOICE_LOG_MESSAGES.PDF_TASK_CREATED(generatePdfTask.id, invoice.id),
    );

    this.logger.log(
      `✅ [CREATE_INVOICE_COMPLETION] Successfully completed create invoice workflow step for customer: ${customerId}`,
    );
  }

  async handleGeneratePdfCompletion(taskId: string) {
    this.logger.log(
      `🔄 [GENERATE_PDF_COMPLETION] Starting to handle generate PDF completion for task: ${taskId}`,
    );

    const task = await this.taskService.getTaskById(taskId);
    if (!task) {
      this.logger.error(
        `❌ [GENERATE_PDF_COMPLETION] Task not found: ${taskId}`,
      );
      throw new Error(INVOICE_ERROR_MESSAGES.TASK_NOT_FOUND(taskId));
    }

    this.logger.log(
      `📋 [GENERATE_PDF_COMPLETION] Task found - Type: ${task.type}, Status: ${task.status}, Workflow: ${task.workflow?.id || 'standalone'}`,
    );

    const { customerId, invoice, pdfUrl } = task.payload;
    this.logger.log(
      `👤 [GENERATE_PDF_COMPLETION] Customer ID: ${customerId}, Invoice ID: ${invoice?.id}`,
    );

    if (!pdfUrl) {
      this.logger.error(
        `❌ [GENERATE_PDF_COMPLETION] PDF URL not found in task payload for task: ${taskId}`,
      );
      throw new Error(INVOICE_ERROR_MESSAGES.PDF_URL_NOT_FOUND);
    }

    this.logger.log(
      `📄 [GENERATE_PDF_COMPLETION] PDF generated successfully - URL: ${pdfUrl}`,
    );

    const emailServiceUrl =
      task.payload.emailServiceUrl ||
      this.configService.get('invoice.emailService.url');

    this.logger.log(
      `🔄 [GENERATE_PDF_COMPLETION] Creating SEND_EMAIL task for customer: ${customerId}`,
    );
    this.logger.log(
      `🔗 [GENERATE_PDF_COMPLETION] Using email service URL: ${emailServiceUrl}`,
    );

    const sendEmailTask = await this.taskService.createTask(
      TaskType.SEND_EMAIL,
      {
        customerId,
        invoice,
        pdfUrl,
        emailServiceUrl,
      },
      task.workflow?.id,
    );

    this.logger.log(
      `✅ [GENERATE_PDF_COMPLETION] SEND_EMAIL task created with ID: ${sendEmailTask.id}`,
    );

    await this.messagingService.publishTask(
      sendEmailTask.type,
      sendEmailTask.id,
    );

    this.logger.log(
      `📤 [GENERATE_PDF_COMPLETION] SEND_EMAIL task published to queue: ${sendEmailTask.id}`,
    );
    this.logger.log(
      INVOICE_LOG_MESSAGES.EMAIL_TASK_CREATED(sendEmailTask.id, customerId),
    );

    this.logger.log(
      `✅ [GENERATE_PDF_COMPLETION] Successfully completed generate PDF workflow step for customer: ${customerId}`,
    );
  }

  async handleSendEmailCompletion(taskId: string) {
    this.logger.log(
      `🔄 [SEND_EMAIL_COMPLETION] Starting to handle send email completion for task: ${taskId}`,
    );

    const task = await this.taskService.getTaskById(taskId);
    if (!task) {
      this.logger.error(`❌ [SEND_EMAIL_COMPLETION] Task not found: ${taskId}`);
      throw new Error(INVOICE_ERROR_MESSAGES.TASK_NOT_FOUND(taskId));
    }

    this.logger.log(
      `📋 [SEND_EMAIL_COMPLETION] Task found - Type: ${task.type}, Status: ${task.status}, Workflow: ${task.workflow?.id || 'standalone'}`,
    );

    const { customerId, invoice } = task.payload;
    this.logger.log(
      `👤 [SEND_EMAIL_COMPLETION] Customer ID: ${customerId}, Invoice ID: ${invoice?.id}`,
    );

    this.logger.log(
      `📧 [SEND_EMAIL_COMPLETION] Email sent successfully to customer: ${customerId}`,
    );

    this.logger.log(
      INVOICE_LOG_MESSAGES.WORKFLOW_COMPLETED(customerId, invoice?.id),
    );

    this.logger.log(
      `🎉 [SEND_EMAIL_COMPLETION] INVOICE WORKFLOW COMPLETED SUCCESSFULLY for customer: ${customerId}`,
    );
    this.logger.log(
      `📊 [SEND_EMAIL_COMPLETION] Final invoice details - ID: ${invoice?.id}, Number: ${invoice?.invoiceNumber}, Amount: ${invoice?.grandTotal}`,
    );

    this.logger.log(
      '💡 [SEND_EMAIL_COMPLETION] Next steps in production: Update orders as invoiced, send business notifications, update workflow status',
    );
  }

  async handleTaskFailure(taskId: string, error: Error) {
    this.logger.error(
      `💥 [TASK_FAILURE] Handling task failure for task: ${taskId}`,
    );
    this.logger.error(`💥 [TASK_FAILURE] Error: ${error.message}`);
    this.logger.error(`💥 [TASK_FAILURE] Stack trace: ${error.stack}`);

    const task = await this.taskService.getTaskById(taskId);
    if (!task) {
      this.logger.error(`❌ [TASK_FAILURE] Task not found: ${taskId}`);
      throw new Error(INVOICE_ERROR_MESSAGES.TASK_NOT_FOUND(taskId));
    }

    this.logger.log(
      `📋 [TASK_FAILURE] Failed task details - Type: ${task.type}, Status: ${task.status}, Workflow: ${task.workflow?.id || 'standalone'}`,
    );
    this.logger.log(
      `👤 [TASK_FAILURE] Customer ID: ${task.payload.customerId}`,
    );

    this.logger.error(INVOICE_LOG_MESSAGES.TASK_FAILED(taskId), error.stack);

    this.logger.log(
      `🔄 [TASK_FAILURE] Creating compensation task for failed task: ${taskId}`,
    );

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

    this.logger.log(
      `✅ [TASK_FAILURE] Compensation task created with ID: ${compensationTask.id}`,
    );

    await this.messagingService.publishTask(
      compensationTask.type,
      compensationTask.id,
    );

    this.logger.log(
      `📤 [TASK_FAILURE] Compensation task published to queue: ${compensationTask.id}`,
    );
    this.logger.log(
      INVOICE_LOG_MESSAGES.COMPENSATION_TASK_CREATED(
        compensationTask.id,
        taskId,
      ),
    );

    this.logger.log(
      '🛠️ [TASK_FAILURE] Task failure handled successfully. Compensation task created and published.',
    );
  }
}
