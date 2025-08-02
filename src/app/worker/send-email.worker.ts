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
export class SendEmailWorker extends BaseWorker {
  constructor(
    taskService: TaskService,
    coordinator: CoordinatorService,
    messagingService: MessagingService,
  ) {
    super(taskService, coordinator, messagingService);
  }

  @MessagePattern('send.email')
  async handleTask(@Payload() data: ITaskMessage) {
    return super.handleTask(data);
  }

  protected async processTask(taskId: string) {
    const task = await this.taskService.getTaskById(taskId);
    if (!task) {
      throw new Error(`Task with id ${taskId} not found`);
    }

    const { customerId, invoice, pdfUrl, emailServiceUrl } = task.payload;

    if (!customerId || !invoice || !pdfUrl) {
      throw new Error(
        'Customer ID, invoice, and PDF URL are required for sending email',
      );
    }

    // Send email to customer with invoice attachment
    const emailResult = await this.sendEmail(
      customerId,
      invoice,
      pdfUrl,
      emailServiceUrl,
    );

    this.logger.log(
      `Email sent to customer ${customerId} for invoice ${invoice.id}: ${emailResult.emailId}`,
    );
  }

  private async sendEmail(
    customerId: string,
    invoice: any,
    pdfUrl: string,
    emailServiceUrl?: string,
  ) {
    // Use provided email service URL or default to a mock service
    const serviceUrl = emailServiceUrl || 'https://api.email-service.com/send';

    try {
      // Get customer email from customer service
      const customerEmail = await this.getCustomerEmail(customerId);

      // Prepare email data
      const emailData = {
        to: customerEmail,
        subject: `Invoice ${invoice.invoiceNumber} - Payment Due`,
        template: 'invoice-notification',
        data: {
          customerName: `Customer ${customerId}`,
          invoiceNumber: invoice.invoiceNumber,
          totalAmount: invoice.grandTotal,
          dueDate: invoice.dueDate,
          items: invoice.items,
        },
        attachments: [
          {
            name: `invoice-${invoice.invoiceNumber}.pdf`,
            url: pdfUrl,
            type: 'application/pdf',
          },
        ],
        options: {
          priority: 'normal',
          trackOpens: true,
          trackClicks: true,
        },
      };

      // In a real implementation, this would be an actual HTTP call to an email service
      // For demonstration, we'll simulate the API call
      if (serviceUrl.includes('mock')) {
        // Simulate email sending
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate processing time

        return {
          emailId: `email-${Date.now()}`,
          status: 'sent',
          messageId: `msg-${Math.random().toString(36).substr(2, 9)}`,
        };
      } else {
        // Real API call to email service
        const response = await axios.post(serviceUrl, emailData, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.EMAIL_SERVICE_API_KEY}`,
          },
          timeout: 10000, // 10 second timeout for email sending
        });

        if (response.status !== 200) {
          throw new Error(`Email sending failed: ${response.statusText}`);
        }

        return response.data;
      }
    } catch (error) {
      this.logger.error(
        `Email sending failed for customer ${customerId}:`,
        error.message,
      );
      throw new Error(`Email sending failed: ${error.message}`);
    }
  }

  private async getCustomerEmail(customerId: string): Promise<string> {
    // In a real implementation, this would fetch customer details from a customer service
    // For demonstration, we'll return a mock email
    return `customer-${customerId}@example.com`;
  }

  protected shouldProcessTaskType(taskType: TaskType): boolean {
    return taskType === TaskType.SEND_EMAIL;
  }
}
