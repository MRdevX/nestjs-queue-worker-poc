import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  NotFoundException,
} from '@nestjs/common';
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

    // Use appropriate pattern based on task type
    if (createTaskDto.type === TaskType.HTTP_REQUEST) {
      // For HTTP requests, use MessagePattern for immediate response
      const response = await this.messagingService.sendMessage(
        'api.http_request',
        {
          taskId: task.id,
          ...createTaskDto.payload,
        },
      );
      return {
        message: 'Task created and processed successfully',
        taskId: task.id,
        type: task.type,
        response,
      };
    } else {
      // For other tasks, use EventPattern for async processing
      await this.messagingService.emitEvent(
        this.getEventPattern(createTaskDto.type),
        {
          taskId: task.id,
          taskType: task.type,
          ...createTaskDto.payload,
        },
      );
      return {
        message: 'Task created and queued successfully',
        taskId: task.id,
        type: task.type,
      };
    }
  }

  private getEventPattern(taskType: TaskType): string {
    switch (taskType) {
      case TaskType.FETCH_ORDERS:
        return 'order.fetch';
      case TaskType.CREATE_INVOICE:
        return 'order.create_invoice';
      case TaskType.GENERATE_PDF:
        return 'pdf.generate';
      case TaskType.SEND_EMAIL:
        return 'email.send';
      case TaskType.COMPENSATION:
        return 'compensation.execute';
      case TaskType.DATA_PROCESSING:
        return 'data.process';
      default:
        return 'task.created';
    }
  }

  @Get(':id')
  async getTask(@Param('id') id: string) {
    const task = await this.taskService.getTaskById(id);
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    return task;
  }

  @Post(':id/retry')
  async retryTask(@Param('id') id: string) {
    const task = await this.taskService.getTaskById(id);
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    await this.taskService.updateTaskStatus(id, TaskStatus.PENDING);

    if (task.type === TaskType.HTTP_REQUEST) {
      await this.messagingService.sendMessage('api.http_request', {
        taskId: task.id,
        ...task.payload,
      });
    } else {
      await this.messagingService.emitEvent(
        this.getEventPattern(task.type),
        {
          taskId: task.id,
          taskType: task.type,
          ...task.payload,
        },
        { metadata: { retry: true } },
      );
    }

    return { message: 'Task queued for retry' };
  }

  @Post(':id/cancel')
  async cancelTask(@Param('id') id: string) {
    await this.taskService.cancelTask(id);
    return { message: 'Task cancelled successfully' };
  }

  @Post(':id/compensate')
  async compensateTask(@Param('id') id: string) {
    const task = await this.taskService.getTaskById(id);
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Create a compensation task
    const compensationTask = await this.taskService.createTask(
      TaskType.COMPENSATION,
      {
        originalTaskId: id,
        originalTaskType: task.type,
        compensationAction: 'rollback',
      },
    );

    await this.messagingService.emitEvent(
      'compensation.execute',
      {
        taskId: compensationTask.id,
        taskType: compensationTask.type,
        originalTaskId: id,
        originalTaskType: task.type,
        compensationAction: 'rollback',
      },
      { metadata: { originalTaskId: id, isCompensation: true } },
    );

    return { message: 'Compensation task created and queued' };
  }
}
