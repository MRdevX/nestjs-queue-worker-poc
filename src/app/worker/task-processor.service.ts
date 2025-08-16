import axios from 'axios';
import { Injectable, Logger } from '@nestjs/common';
import { TaskService } from '../task/task.service';
import { UtilsService } from '../core/utils/utils.service';

@Injectable()
export class TaskProcessorService {
  private readonly logger = new Logger(TaskProcessorService.name);

  constructor(private readonly taskService: TaskService) {}

  async processHttpRequest(taskId: string): Promise<void> {
    const task = await this.taskService.getTaskById(taskId);
    if (!task) {
      throw new Error(`Task with id ${taskId} not found`);
    }

    const { url, method = 'GET', headers = {}, body } = task.payload;

    const response = await axios({
      method,
      url,
      headers,
      data: body,
      timeout: 30000,
    });

    await this.taskService.updateTaskPayload(taskId, {
      ...task.payload,
      response: response.data,
    });
  }

  async processDataProcessing(taskId: string): Promise<void> {
    const task = await this.taskService.getTaskById(taskId);
    if (!task) {
      throw new Error(`Task with id ${taskId} not found`);
    }

    await UtilsService.sleep(500);

    if (task.payload?.forceFailure === true) {
      throw new Error('Forced failure for testing purposes');
    }

    if (Math.random() > 0.8) {
      throw new Error('Random processing failure');
    }
  }

  async processCompensation(taskId: string): Promise<void> {
    const task = await this.taskService.getTaskById(taskId);
    if (!task) {
      throw new Error(`Task with id ${taskId} not found`);
    }

    const { originalTaskId, originalTaskType, reason } = task.payload;

    this.logger.log(
      `Processing compensation for task ${originalTaskId} (${originalTaskType}): ${reason}`,
    );

    await UtilsService.sleep(1000);
  }

  async processFetchOrders(taskId: string): Promise<void> {
    const task = await this.taskService.getTaskById(taskId);
    if (!task) {
      throw new Error(`Task with id ${taskId} not found`);
    }

    const { customerId, dateFrom, dateTo } = task.payload;

    const orders = await this.fetchOrdersFromExternalApi(
      customerId,
      dateFrom,
      dateTo,
    );

    await this.taskService.updateTaskPayload(taskId, {
      ...task.payload,
      orders,
    });
  }

  async processCreateInvoice(taskId: string): Promise<void> {
    const task = await this.taskService.getTaskById(taskId);
    if (!task) {
      throw new Error(`Task with id ${taskId} not found`);
    }

    const { customerId, orders } = task.payload;

    const invoice = await this.createInvoice(customerId, orders);

    await this.taskService.updateTaskPayload(taskId, {
      ...task.payload,
      invoice,
    });
  }

  async processGeneratePdf(taskId: string): Promise<void> {
    const task = await this.taskService.getTaskById(taskId);
    if (!task) {
      throw new Error(`Task with id ${taskId} not found`);
    }

    const { invoice, pdfProcessorUrl } = task.payload;

    const pdfUrl = await this.generatePdf(invoice, pdfProcessorUrl);

    await this.taskService.updateTaskPayload(taskId, {
      ...task.payload,
      pdfUrl,
    });
  }

  async processSendEmail(taskId: string): Promise<void> {
    const task = await this.taskService.getTaskById(taskId);
    if (!task) {
      throw new Error(`Task with id ${taskId} not found`);
    }

    const { customerId, invoice, pdfUrl, emailServiceUrl } = task.payload;

    await this.sendEmail(customerId, invoice, pdfUrl, emailServiceUrl);
  }

  private async fetchOrdersFromExternalApi(
    customerId: string,
    dateFrom?: string,
    dateTo?: string,
  ) {
    // Simulate external API call
    await UtilsService.sleep(1000);

    const mockOrders = [
      {
        id: `order-${Date.now()}`,
        customerId,
        status: 'delivered',
        invoiced: false,
        items: [
          { id: 'item-1', name: 'Product A', price: 100, quantity: 2 },
          { id: 'item-2', name: 'Product B', price: 50, quantity: 1 },
        ],
        totalAmount: 250,
        deliveryDate: new Date().toISOString(),
      },
    ];

    return mockOrders;
  }

  private async createInvoice(
    customerId: string,
    orders: any[],
    invoiceNumber?: string,
  ) {
    const totalAmount = orders.reduce(
      (sum, order) => sum + order.totalAmount,
      0,
    );
    const taxAmount = totalAmount * 0.1;
    const grandTotal = totalAmount + taxAmount;

    return {
      id: `invoice-${Date.now()}`,
      invoiceNumber: invoiceNumber || `INV-${Date.now()}`,
      customerId,
      orders: orders.map((order) => order.id),
      items: orders.flatMap((order) => order.items),
      totalAmount,
      taxAmount,
      grandTotal,
      status: 'created',
      createdAt: new Date().toISOString(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  private async generatePdf(invoice: any, pdfProcessorUrl?: string) {
    const url = pdfProcessorUrl || 'https://mock-pdf-processor.com/generate';

    try {
      const response = await axios.post(url, { invoice }, { timeout: 30000 });
      return (
        response.data.pdfUrl ||
        `https://storage.example.com/invoices/${invoice.invoiceNumber}.pdf`
      );
    } catch (error) {
      this.logger.error('PDF generation failed:', error.message);
      throw new Error('PDF generation failed');
    }
  }

  private async sendEmail(
    customerId: string,
    invoice: any,
    pdfUrl: string,
    emailServiceUrl?: string,
  ) {
    const url = emailServiceUrl || 'https://mock-email-service.com/send';
    const customerEmail = await this.getCustomerEmail(customerId);

    try {
      await axios.post(
        url,
        {
          to: customerEmail,
          subject: `Invoice ${invoice.invoiceNumber}`,
          body: `Your invoice ${invoice.invoiceNumber} is ready. Total: $${invoice.grandTotal}`,
          pdfUrl,
        },
        { timeout: 30000 },
      );

      this.logger.log(
        `Email sent to ${customerEmail} for invoice ${invoice.invoiceNumber}`,
      );
    } catch (error) {
      this.logger.error('Email sending failed:', error.message);
      throw new Error('Email sending failed');
    }
  }

  private async getCustomerEmail(customerId: string): Promise<string> {
    // Simulate customer email lookup
    await UtilsService.sleep(100);
    return `customer-${customerId}@example.com`;
  }
}
