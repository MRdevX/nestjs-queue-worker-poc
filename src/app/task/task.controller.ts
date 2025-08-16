import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  NotFoundException,
  Query,
} from '@nestjs/common';
import { TaskService } from './task.service';
import { MessagingService } from '../core/messaging/services/messaging.service';
import { TaskType } from './types/task-type.enum';
import { TaskStatus } from './types/task-status.enum';
import { CreateTaskDto, TaskFiltersDto } from './types/task.dto';

@Controller('tasks')
export class TaskController {
  constructor(
    private readonly taskService: TaskService,
    private readonly messagingService: MessagingService,
  ) {}

  @Post()
  async createTask(@Body() createTaskDto: CreateTaskDto) {
    const task = await this.taskService.createTask(
      createTaskDto.type,
      createTaskDto.payload,
    );

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
      status: task.status,
    };
  }

  @Get()
  async getTasks(@Query() filters: TaskFiltersDto) {
    const tasks = await this.taskService.findTasks(filters);

    return {
      tasks,
      total: tasks.length,
    };
  }

  @Get(':id')
  async getTask(
    @Param('id') id: string,
    @Query('relations') relations?: string,
  ) {
    const relationArray = relations ? relations.split(',') : undefined;
    const task = await this.taskService.getTaskById(id, relationArray);

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

    await this.messagingService.emitEvent(
      this.getEventPattern(task.type),
      {
        taskId: task.id,
        taskType: task.type,
        ...task.payload,
      },
      { metadata: { retry: true } },
    );

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

    const compensationTask = await this.taskService.createTask(
      TaskType.COMPENSATION,
      {
        originalTaskId: id,
        originalTaskType: task.type,
        compensationAction: 'rollback',
      },
    );

    await this.messagingService.emitEvent(
      'compensation',
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

  private getEventPattern(taskType: TaskType): string {
    const patterns = {
      [TaskType.HTTP_REQUEST]: 'http.request',
      [TaskType.FETCH_ORDERS]: 'fetch.orders',
      [TaskType.CREATE_INVOICE]: 'create.invoice',
      [TaskType.GENERATE_PDF]: 'generate.pdf',
      [TaskType.SEND_EMAIL]: 'send.email',
      [TaskType.COMPENSATION]: 'compensation',
      [TaskType.DATA_PROCESSING]: 'data.processing',
    };

    return patterns[taskType] || 'task.created';
  }
}
