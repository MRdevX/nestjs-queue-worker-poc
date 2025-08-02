import { Injectable } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { BaseWorker } from './base.worker';
import { TaskService } from '../task/task.service';
import { CoordinatorService } from '../workflow/coordinator.service';
import { MessagingService } from '../core/messaging/messaging.service';
import { TaskType } from '../task/types/task-type.enum';
import { ITaskMessage } from '../core/messaging/types/task-message.interface';

@Injectable()
export class FetchOrdersWorker extends BaseWorker {
  constructor(
    taskService: TaskService,
    coordinator: CoordinatorService,
    messagingService: MessagingService,
  ) {
    super(taskService, coordinator, messagingService);
  }

  @MessagePattern('fetch.orders')
  async handleTask(@Payload() data: ITaskMessage) {
    return super.handleTask(data);
  }

  protected async processTask(taskId: string) {
    const task = await this.taskService.getTaskById(taskId);
    if (!task) {
      throw new Error(`Task with id ${taskId} not found`);
    }

    const { customerId, dateFrom, dateTo } = task.payload;

    if (!customerId) {
      throw new Error('Customer ID is required for fetching orders');
    }

    // Simulate fetching orders from Ninox database
    // In a real implementation, this would connect to the Ninox database
    const orders = await this.fetchOrdersFromNinox(
      customerId,
      dateFrom,
      dateTo,
    );

    // Filter orders that are delivered but not invoiced
    const deliverableOrders = orders.filter(
      (order) => order.status === 'delivered' && !order.invoiced,
    );

    // Update task payload with fetched orders
    // Note: In a real implementation, you would update the task payload in the database
    // For now, we'll just log the results
    this.logger.log(
      `Fetched ${deliverableOrders.length} deliverable orders for customer ${customerId}`,
    );

    // Store the results in task logs for the next step to access
    await this.taskService.updateTaskStatus(taskId, task.status, undefined);
  }

  private async fetchOrdersFromNinox(
    customerId: string,
    dateFrom?: string,
    dateTo?: string,
  ) {
    // Simulate API call to Ninox database
    // In a real implementation, this would be an actual HTTP call to Ninox API

    // Mock data for demonstration
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

    // Filter by date range if provided
    let filteredOrders = mockOrders;
    if (dateFrom || dateTo) {
      filteredOrders = mockOrders.filter((order) => {
        // Skip orders with null delivery date when filtering by date
        if (!order.deliveryDate) {
          return false;
        }

        if (dateFrom && order.deliveryDate < dateFrom) {
          return false;
        }
        if (dateTo && order.deliveryDate > dateTo) {
          return false;
        }
        return true;
      });
    }

    return filteredOrders;
  }

  protected shouldProcessTaskType(taskType: TaskType): boolean {
    return taskType === TaskType.FETCH_ORDERS;
  }
}
