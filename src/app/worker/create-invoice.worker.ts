import { Injectable } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { BaseWorker } from './base.worker';
import { TaskService } from '../task/task.service';
import { CoordinatorService } from '../workflow/coordinator.service';
import { MessagingService } from '../core/messaging/messaging.service';
import { TaskType } from '../task/types/task-type.enum';
import { ITaskMessage } from '../core/messaging/types/task-message.interface';

@Injectable()
export class CreateInvoiceWorker extends BaseWorker {
  constructor(
    taskService: TaskService,
    coordinator: CoordinatorService,
    messagingService: MessagingService,
  ) {
    super(taskService, coordinator, messagingService);
  }

  @MessagePattern('create.invoice')
  async handleTask(@Payload() data: ITaskMessage) {
    return super.handleTask(data);
  }

  protected async processTask(taskId: string) {
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

    // Create invoice from orders
    const invoice = await this.createInvoice(customerId, orders, invoiceNumber);

    // Update task payload with created invoice
    const updatedPayload = {
      ...task.payload,
      invoice,
      invoiceId: invoice.id,
    };

    // In a real implementation, you would update the task with the invoice data
    // For now, we'll just log the invoice creation
    this.logger.log(
      `Invoice created: ${invoice.id} for customer ${customerId}`,
    );
  }

  private async createInvoice(
    customerId: string,
    orders: any[],
    invoiceNumber?: string,
  ) {
    // Calculate total amount from all orders
    const totalAmount = orders.reduce(
      (sum, order) => sum + order.totalAmount,
      0,
    );

    // Generate invoice number if not provided
    const finalInvoiceNumber =
      invoiceNumber ||
      `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create invoice object
    const invoice = {
      id: `invoice-${Date.now()}`,
      invoiceNumber: finalInvoiceNumber,
      customerId,
      orders: orders.map((order) => order.id),
      items: orders.flatMap((order) => order.items),
      totalAmount,
      taxAmount: totalAmount * 0.1, // 10% tax
      grandTotal: totalAmount * 1.1,
      status: 'created',
      createdAt: new Date().toISOString(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
    };

    // In a real implementation, you would save this to a database
    // For now, we'll just return the invoice object
    return invoice;
  }

  protected shouldProcessTaskType(taskType: TaskType): boolean {
    return taskType === TaskType.CREATE_INVOICE;
  }
}
