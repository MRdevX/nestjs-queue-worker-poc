import { Injectable } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { BaseWorker } from './base.worker';
import { TaskService } from '../task/task.service';
import { CoordinatorFactoryService } from '../workflow/coordinator-factory.service';
import { TaskType } from '../task/types/task-type.enum';
import { ITaskMessage } from '../core/messaging/types/task-message.interface';

@Injectable()
export class FetchOrdersWorker extends BaseWorker {
  constructor(
    taskService: TaskService,
    coordinatorFactory: CoordinatorFactoryService,
  ) {
    super(taskService, coordinatorFactory);
  }

  @EventPattern('fetch.orders')
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

  protected shouldProcessTaskType(taskType: TaskType): boolean {
    return taskType === TaskType.FETCH_ORDERS;
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
