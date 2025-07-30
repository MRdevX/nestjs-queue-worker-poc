import axios from 'axios';
import { Injectable } from '@nestjs/common';
import { BaseWorker } from './base.worker';
import { CoordinatorService } from '../workflow/coordinator.service';
import { MessagingService } from '../core/messaging/messaging.service';
import { TaskService } from '../task/task.service';

@Injectable()
export class HttpWorker extends BaseWorker {
  constructor(
    taskService: TaskService,
    coordinator: CoordinatorService,
    messagingService: MessagingService,
  ) {
    super(taskService, coordinator, messagingService);
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
}
