import {
  Controller,
  Get,
  Post,
  Param,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { TaskService } from './task.service';
import { MessagingService } from '../core/messaging/messaging.service';
import { TaskStatus } from './types/task-status.enum';

@Controller('queue')
export class QueueController {
  constructor(
    private readonly taskService: TaskService,
    private readonly messagingService: MessagingService,
  ) {}

  @Get('status')
  async getQueueStatus() {
    const pendingTasks = await this.taskService.getPendingTasks();
    const processingTasks = await this.taskService.findMany({
      status: TaskStatus.PROCESSING,
    });
    const failedTasks = await this.taskService.findMany({
      status: TaskStatus.FAILED,
    });

    return {
      pending: pendingTasks.length,
      processing: processingTasks.length,
      failed: failedTasks.length,
      total: pendingTasks.length + processingTasks.length + failedTasks.length,
    };
  }

  @Get('pending')
  async getPendingTasks() {
    return this.taskService.getPendingTasks();
  }

  @Get('failed')
  async getFailedTasks() {
    return this.taskService.findMany({ status: TaskStatus.FAILED });
  }

  @Post(':id/retry')
  async retryTask(@Param('id') id: string) {
    const task = await this.taskService.getTaskById(id);
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    await this.taskService.updateTaskStatus(id, TaskStatus.PENDING);
    await this.messagingService.publishTask(task.type, task.id, {
      metadata: { retry: true },
    });

    return { message: 'Task queued for retry' };
  }

  @Post(':id/cancel')
  async cancelTask(@Param('id') id: string) {
    const task = await this.taskService.getTaskById(id);
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.status !== 'pending') {
      throw new BadRequestException('Only pending tasks can be cancelled');
    }

    await this.taskService.updateTaskStatus(id, TaskStatus.CANCELLED);
    return { message: 'Task cancelled successfully' };
  }
}
