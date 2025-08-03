import { Injectable, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { TaskService } from '../task/task.service';
import { CoordinatorService } from '../workflow/coordinator.service';
import { MessagingService } from '../core/messaging/messaging.service';
import { TaskStatus } from '../task/types/task-status.enum';

@Injectable()
export class FetchOrdersWorker {
  private readonly logger = new Logger(FetchOrdersWorker.name);

  constructor(
    private readonly taskService: TaskService,
    private readonly coordinator: CoordinatorService,
    private readonly messagingService: MessagingService,
  ) {}

  @EventPattern('order.fetch')
  async handleFetchOrders(@Payload() data: any) {
    this.logger.log(`Received fetch orders event: ${JSON.stringify(data)}`);

    const { taskId, customerId, dateFrom, dateTo } = data;
    if (!taskId || !customerId) {
      throw new Error('Task ID and customer ID are required');
    }

    try {
      const task = await this.taskService.getTaskById(taskId);
      if (!task) {
        throw new Error(`Task ${taskId} not found`);
      }

      await this.taskService.updateTaskStatus(taskId, TaskStatus.PROCESSING);

      this.logger.log(`Fetching orders for customer: ${customerId}`);

      const orders = await this.fetchOrdersFromNinox(
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

      await this.taskService.updateTaskStatus(taskId, TaskStatus.COMPLETED);
      await this.taskService.updateTaskPayload(taskId, {
        ...task.payload,
        orders: deliverableOrders,
      });

      await this.coordinator.handleTaskCompletion(taskId);
    } catch (error) {
      this.logger.error(`Failed to fetch orders: ${taskId}`, error.stack);
      await this.taskService.handleFailure(taskId, error);
      await this.coordinator.handleTaskFailure(taskId, error);
      throw error;
    }
  }

  private async fetchOrdersFromNinox(
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
}
