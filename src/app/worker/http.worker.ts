import axios from 'axios';
import { Injectable } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { BaseWorker } from './base.worker';
import { CoordinatorService } from '../workflow/coordinator.service';
import { MessagingService } from '../core/messaging/messaging.service';
import { TaskService } from '../task/task.service';
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

  @MessagePattern('http.request')
  async handleTask(@Payload() data: ITaskMessage) {
    return super.handleTask(data);
  }

  protected async processTask(taskId: string) {
    const task = await this.taskService.getTaskById(taskId);
    if (!task) {
      throw new Error(`Task with id ${taskId} not found`);
    }

    const { url, method } = task.payload;

    if (!url || !method) {
      throw new Error('URL and method are required for HTTP tasks');
    }

    const response = await axios({
      method,
      url,
      timeout: 10000,
    });

    if (response.status >= 400) {
      throw new Error(`HTTP ${response.status}`);
    }
  }

  protected shouldProcessTaskType(taskType: TaskType): boolean {
    return taskType === TaskType.HTTP_REQUEST;
  }
}
