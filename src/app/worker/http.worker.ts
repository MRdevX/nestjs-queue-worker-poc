import axios from 'axios';
import { Injectable, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TaskService } from '../task/task.service';
import { CoordinatorService } from '../workflow/coordinator.service';
import { MessagingService } from '../core/messaging/messaging.service';
import { TaskStatus } from '../task/types/task-status.enum';

@Injectable()
export class HttpWorker {
  private readonly logger = new Logger(HttpWorker.name);

  constructor(
    private readonly taskService: TaskService,
    private readonly coordinator: CoordinatorService,
    private readonly messagingService: MessagingService,
  ) {}

  @MessagePattern('api.http_request')
  async handleHttpRequest(@Payload() data: any) {
    this.logger.log(`Received HTTP request: ${JSON.stringify(data)}`);

    const { taskId, url, method, headers, body } = data;
    if (!taskId || !url || !method) {
      throw new Error('Task ID, URL, and method are required');
    }

    try {
      const task = await this.taskService.getTaskById(taskId);
      if (!task) {
        throw new Error(`Task ${taskId} not found`);
      }

      await this.taskService.updateTaskStatus(taskId, TaskStatus.PROCESSING);

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

      // Update task with response
      await this.taskService.updateTaskStatus(taskId, TaskStatus.COMPLETED);
      await this.taskService.updateTaskPayload(taskId, {
        ...task.payload,
        response: response.data,
      });

      this.logger.log(`HTTP request completed successfully: ${taskId}`);

      // Handle workflow completion
      await this.coordinator.handleTaskCompletion(taskId);

      return { success: true, response: response.data };
    } catch (error) {
      this.logger.error(`HTTP request failed: ${taskId}`, error.stack);
      await this.taskService.handleFailure(taskId, error);
      await this.coordinator.handleTaskFailure(taskId, error);
      throw error;
    }
  }
}
