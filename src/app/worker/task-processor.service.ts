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

    const { url, method, headers, body } = task.payload;

    if (!url || !method) {
      throw new Error('URL and method are required for HTTP tasks');
    }

    this.logger.log(`Making HTTP ${method} request to: ${url}`);

    const response = await axios({
      method,
      url,
      headers,
      data: body,
      timeout: 10000,
    });

    if (response.status >= 400) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

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

    this.logger.log(
      `Processing compensation task ${taskId} for original task ${task.payload.originalTaskId}`,
    );

    await UtilsService.sleep(1000);

    this.logger.log(
      `Compensation completed for task ${task.payload.originalTaskId}`,
    );
  }

  async processFetchOrders(taskId: string): Promise<void> {
    const task = await this.taskService.getTaskById(taskId);
    if (!task) {
      throw new Error(`Task with id ${taskId} not found`);
    }

    const { customerId, dateFrom, dateTo } = task.payload;

    if (!customerId) {
      throw new Error('Customer ID is required');
    }

    this.logger.log(`Fetching orders for customer: ${customerId}`);

    const orders = await this.fetchOrdersFromExternalApi(
      customerId,
      dateFrom,
      dateTo,
    );
    const deliverableOrders = orders.filter(
      (order) => order.status === 'delivered' && !order.invoiced,
    );

    this.logger.log(
      `Fetched ${deliverableOrders.length} deliverable orders for customer ${customerId}`,
    );

    await this.taskService.updateTaskPayload(taskId, {
      ...task.payload,
      orders: deliverableOrders,
    });
  }

  async processCreateInvoice(taskId: string): Promise<void> {
    const task = await this.taskService.getTaskById(taskId);
    if (!task) {
      throw new Error(`Task with id ${taskId} not found`);
    }

    const { customerId, orders, invoiceNumber } = task.payload;

    if (!customerId || !orders || !Array.isArray(orders)) {
      throw new Error(
        'Customer ID and orders array are required for creating invoice',
      );
    }

    const invoice = await this.createInvoice(customerId, orders, invoiceNumber);

    await this.taskService.updateTaskPayload(taskId, {
      ...task.payload,
      invoice,
    });

    this.logger.log(
      `Invoice created: ${invoice.id} for customer ${customerId}`,
    );
  }

  async processGeneratePdf(taskId: string): Promise<void> {
    const task = await this.taskService.getTaskById(taskId);
    if (!task) {
      throw new Error(`Task with id ${taskId} not found`);
    }

    const { invoice, pdfProcessorUrl } = task.payload;

    if (!invoice) {
      throw new Error('Invoice data is required for PDF generation');
    }

    const pdfUrl = await this.generatePdf(invoice, pdfProcessorUrl);

    await this.taskService.updateTaskPayload(taskId, {
      ...task.payload,
      pdfUrl,
    });

    this.logger.log(`PDF generated for invoice ${invoice.id}: ${pdfUrl}`);
  }

  async processSendEmail(taskId: string): Promise<void> {
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

  private async fetchOrdersFromExternalApi(
    customerId: string,
    dateFrom?: string,
    dateTo?: string,
  ) {
    const mockOrders = [
      {
        id: 'order-1',
        customerId,
        status: 'delivered',
        invoiced: false,
        items: [
          { id: 'item-1', name: 'Product A', price: 100, quantity: 2 },
          { id: 'item-2', name: 'Product B', price: 50, quantity: 1 },
        ],
        totalAmount: 250,
        deliveryDate: '2024-01-15',
      },
      {
        id: 'order-2',
        customerId,
        status: 'delivered',
        invoiced: false,
        items: [{ id: 'item-3', name: 'Product C', price: 75, quantity: 3 }],
        totalAmount: 225,
        deliveryDate: '2024-01-16',
      },
      {
        id: 'order-3',
        customerId,
        status: 'pending',
        invoiced: false,
        items: [{ id: 'item-4', name: 'Product D', price: 200, quantity: 1 }],
        totalAmount: 200,
        deliveryDate: null,
      },
    ];

    let filteredOrders = mockOrders;
    if (dateFrom || dateTo) {
      filteredOrders = mockOrders.filter((order) => {
        if (!order.deliveryDate) return false;
        if (dateFrom && order.deliveryDate < dateFrom) return false;
        if (dateTo && order.deliveryDate > dateTo) return false;
        return true;
      });
    }

    return filteredOrders;
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
    const finalInvoiceNumber =
      invoiceNumber ||
      `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return {
      id: `invoice-${Date.now()}`,
      invoiceNumber: finalInvoiceNumber,
      customerId,
      orders: orders.map((order) => order.id),
      items: orders.flatMap((order) => order.items),
      totalAmount,
      taxAmount: totalAmount * 0.1,
      grandTotal: totalAmount * 1.1,
      status: 'created',
      createdAt: new Date().toISOString(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  private async generatePdf(invoice: any, pdfProcessorUrl?: string) {
    const processorUrl =
      pdfProcessorUrl || 'https://api.pdf-processor.com/generate';

    try {
      if (processorUrl.includes('mock')) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return `https://storage.example.com/invoices/${invoice.invoiceNumber}.pdf`;
      }

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

      const response = await axios.post(processorUrl, pdfData, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.PDF_PROCESSOR_API_KEY}`,
        },
        timeout: 30000,
      });

      if (response.status !== 200) {
        throw new Error(`PDF generation failed: ${response.statusText}`);
      }

      return response.data.pdfUrl;
    } catch (error) {
      this.logger.error(
        `PDF generation failed for invoice ${invoice.id}:`,
        error.message,
      );
      throw new Error(`PDF generation failed: ${error.message}`);
    }
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
      }

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
}
