import axios from 'axios';
import { Injectable } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { BaseWorker } from './base.worker';
import { TaskService } from '../task/task.service';
import { CoordinatorService } from '../workflow/coordinator.service';
import { MessagingService } from '../core/messaging/messaging.service';
import { TaskType } from '../task/types/task-type.enum';
import { ITaskMessage } from '../core/messaging/types/task-message.interface';

@Injectable()
export class GeneratePdfWorker extends BaseWorker {
  constructor(
    taskService: TaskService,
    coordinator: CoordinatorService,
    messagingService: MessagingService,
  ) {
    super(taskService, coordinator, messagingService);
  }

  @MessagePattern('generate.pdf')
  async handleTask(@Payload() data: ITaskMessage) {
    return super.handleTask(data);
  }

  protected async processTask(taskId: string) {
    const task = await this.taskService.getTaskById(taskId);
    if (!task) {
      throw new Error(`Task with id ${taskId} not found`);
    }

    const { invoice, pdfProcessorUrl } = task.payload;

    if (!invoice) {
      throw new Error('Invoice data is required for PDF generation');
    }

    // Generate PDF using external PDF processor
    const pdfUrl = await this.generatePdf(invoice, pdfProcessorUrl);

    // Update task payload with PDF URL
    const updatedPayload = {
      ...task.payload,
      pdfUrl,
      pdfGenerated: true,
    };

    this.logger.log(`PDF generated for invoice ${invoice.id}: ${pdfUrl}`);
  }

  private async generatePdf(invoice: any, pdfProcessorUrl?: string) {
    // Use provided PDF processor URL or default to a mock service
    const processorUrl =
      pdfProcessorUrl || 'https://api.pdf-processor.com/generate';

    try {
      // Prepare invoice data for PDF generation
      const pdfData = {
        template: 'invoice',
        data: {
          invoiceNumber: invoice.invoiceNumber,
          customerId: invoice.customerId,
          items: invoice.items,
          subtotal: invoice.totalAmount,
          tax: invoice.taxAmount,
          total: invoice.grandTotal,
          dueDate: invoice.dueDate,
          createdAt: invoice.createdAt,
        },
        options: {
          format: 'A4',
          orientation: 'portrait',
        },
      };

      // In a real implementation, this would be an actual HTTP call to a PDF service
      // For demonstration, we'll simulate the API call
      if (processorUrl.includes('mock')) {
        // Simulate PDF generation
        await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate processing time

        return `https://storage.example.com/invoices/${invoice.invoiceNumber}.pdf`;
      } else {
        // Real API call to PDF processor
        const response = await axios.post(processorUrl, pdfData, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.PDF_PROCESSOR_API_KEY}`,
          },
          timeout: 30000, // 30 second timeout for PDF generation
        });

        if (response.status !== 200) {
          throw new Error(`PDF generation failed: ${response.statusText}`);
        }

        return response.data.pdfUrl;
      }
    } catch (error) {
      this.logger.error(
        `PDF generation failed for invoice ${invoice.id}:`,
        error.message,
      );
      throw new Error(`PDF generation failed: ${error.message}`);
    }
  }

  protected shouldProcessTaskType(taskType: TaskType): boolean {
    return taskType === TaskType.GENERATE_PDF;
  }
}
