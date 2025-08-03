import axios from 'axios';
import { Injectable } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { BaseWorker } from './base.worker';
import { TaskService } from '../task/task.service';
import { CoordinatorService } from '../workflow/coordinator.service';
import { MessagingService } from '../core/messaging/messaging.service';
import { TaskType } from '../task/types/task-type.enum';
import { ITaskMessage } from '../core/messaging/types/task-message.interface';

@Injectable()
export class HttpWorker extends BaseWorker {
  constructor(
    taskService: TaskService,
    coordinator: CoordinatorService,
    messagingService: MessagingService,
  ) {
    super(taskService, coordinator, messagingService);
  }

  @EventPattern('http.request')
  async handleTask(@Payload() data: ITaskMessage) {
    return super.handleTask(data);
  }

  protected async processTask(taskId: string) {
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

    this.logger.log(`HTTP request completed successfully: ${taskId}`);
  }

  protected shouldProcessTaskType(taskType: TaskType): boolean {
    return taskType === TaskType.HTTP_REQUEST;
  }
}
