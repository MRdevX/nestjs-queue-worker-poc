import { Injectable } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { TaskService } from '../task/task.service';
import { InvoiceCoordinatorService } from '../invoice/invoice-coordinator.service';
import { TaskType } from '../task/types/task-type.enum';
import { ITaskMessage } from '../core/messaging/types/task-message.interface';
import { TaskProcessorService } from './task-processor.service';
import { BaseWorker } from './base.worker';

@Injectable()
export class UnifiedWorker extends BaseWorker {
  constructor(
    taskService: TaskService,
    invoiceCoordinator: InvoiceCoordinatorService,
    private readonly taskProcessor: TaskProcessorService,
  ) {
    super(taskService, invoiceCoordinator);
  }

  @EventPattern('http.request')
  async handleHttpRequest(@Payload() data: ITaskMessage) {
    return this.handleTask(data);
  }

  @EventPattern('data.processing')
  async handleDataProcessing(@Payload() data: ITaskMessage) {
    return this.handleTask(data);
  }

  @EventPattern('compensation')
  async handleCompensation(@Payload() data: ITaskMessage) {
    return this.handleTask(data);
  }

  @EventPattern('fetch.orders')
  async handleFetchOrders(@Payload() data: ITaskMessage) {
    return this.handleTask(data);
  }

  @EventPattern('create.invoice')
  async handleCreateInvoice(@Payload() data: ITaskMessage) {
    return this.handleTask(data);
  }

  @EventPattern('generate.pdf')
  async handleGeneratePdf(@Payload() data: ITaskMessage) {
    return this.handleTask(data);
  }

  @EventPattern('send.email')
  async handleSendEmail(@Payload() data: ITaskMessage) {
    return this.handleTask(data);
  }

  protected async processTask(taskId: string): Promise<void> {
    const task = await this.taskService.getTaskById(taskId);
    if (!task) {
      throw new Error(`Task with id ${taskId} not found`);
    }

    switch (task.type) {
      case TaskType.HTTP_REQUEST:
        await this.taskProcessor.processHttpRequest(taskId);
        break;
      case TaskType.DATA_PROCESSING:
        await this.taskProcessor.processDataProcessing(taskId);
        break;
      case TaskType.COMPENSATION:
        await this.taskProcessor.processCompensation(taskId);
        break;
      case TaskType.FETCH_ORDERS:
        await this.taskProcessor.processFetchOrders(taskId);
        break;
      case TaskType.CREATE_INVOICE:
        await this.taskProcessor.processCreateInvoice(taskId);
        break;
      case TaskType.GENERATE_PDF:
        await this.taskProcessor.processGeneratePdf(taskId);
        break;
      case TaskType.SEND_EMAIL:
        await this.taskProcessor.processSendEmail(taskId);
        break;
      default:
        throw new Error(`Unsupported task type: ${task.type}`);
    }
  }
}
