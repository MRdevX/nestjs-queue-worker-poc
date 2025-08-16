import axios from 'axios';
import { Injectable } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { BaseWorker } from './base.worker';
import { TaskService } from '../task/task.service';
import { CoordinatorFactoryService } from '../workflow/services/coordinator-factory.service';
import { TaskType } from '../task/types/task-type.enum';
import { ITaskMessage } from '../core/messaging/types/task-message.interface';

@Injectable()
export class SendEmailWorker extends BaseWorker {
  constructor(
    taskService: TaskService,
    coordinatorFactory: CoordinatorFactoryService,
  ) {
    super(taskService, coordinatorFactory);
  }

  @EventPattern('send.email')
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

    if (!invoice.invoiceNumber || !invoice.grandTotal) {
      throw new Error(
        'Invoice must contain invoiceNumber and grandTotal properties',
      );
    }

    const emailResult = await this.sendEmail(
      customerId,
      invoice,
      pdfUrl,
      emailServiceUrl,
    );

    await this.taskService.updateTaskPayload(taskId, {
      ...task.payload,
      emailResult,
    });

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
    const serviceUrl = emailServiceUrl || 'https://api.email-service.com/send';

    try {
      const customerEmail = await this.getCustomerEmail(customerId);

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

      if (serviceUrl.includes('mock')) {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        return {
          emailId: `email-${Date.now()}`,
          status: 'sent',
          messageId: `msg-${Math.random().toString(36).substr(2, 9)}`,
        };
      } else {
        const response = await axios.post(serviceUrl, emailData, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.EMAIL_SERVICE_API_KEY}`,
          },
          timeout: 10000,
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
    return `customer-${customerId}@example.com`;
  }

  protected shouldProcessTaskType(taskType: TaskType): boolean {
    return taskType === TaskType.SEND_EMAIL;
  }
}
