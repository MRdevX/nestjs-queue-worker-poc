import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { TaskService } from './task.service';
import { MessagingService } from '../core/messaging/messaging.service';
import { TaskType } from './types/task-type.enum';
import { TaskStatus } from './types/task-status.enum';

@Controller('tasks')
export class TaskController {
  constructor(
    private readonly taskService: TaskService,
    private readonly messagingService: MessagingService,
  ) {}

  @Post()
  async createTask(@Body() createTaskDto: { type: TaskType; payload: any }) {
    const task = await this.taskService.createTask(
      createTaskDto.type,
      createTaskDto.payload,
    );
    await this.messagingService.publishTask(task.type, task.id);
    return task;
  }

  @Get(':id')
  async getTask(@Param('id') id: string) {
    return this.taskService.getTaskById(id);
  }

  @Post(':id/retry')
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
}
