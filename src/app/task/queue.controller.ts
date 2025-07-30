import { Controller, Get, Post, Param } from '@nestjs/common';
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

  @Get('tasks/pending')
  async getPendingTasks() {
    return this.taskService.getPendingTasks();
  }

  @Get('tasks/failed')
  async getFailedTasks() {
    return this.taskService.findMany({ status: TaskStatus.FAILED });
  }

  @Post('tasks/:id/retry')
  async retryTask(@Param('id') id: string) {
    const task = await this.taskService.getTaskById(id);
    if (!task) {
      throw new Error('Task not found');
    }

    await this.taskService.updateTaskStatus(id, TaskStatus.PENDING);
    await this.messagingService.publishTask(task.type, task.id, {
      metadata: { retry: true },
    });

    return { message: 'Task queued for retry' };
  }

  @Post('tasks/:id/cancel')
  async cancelTask(@Param('id') id: string) {
    const task = await this.taskService.getTaskById(id);
    if (!task) {
      throw new Error('Task not found');
    }

    if (task.status !== 'pending') {
      throw new Error('Only pending tasks can be cancelled');
    }

    await this.taskService.updateTaskStatus(id, TaskStatus.CANCELLED);
    return { message: 'Task cancelled successfully' };
  }
}
