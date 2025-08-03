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
  async getAllTasks(
    @Query('status') status?: TaskStatus,
    @Query('type') type?: TaskType,
    @Query('workflowId') workflowId?: string,
  ) {
    const where: any = {};

    if (status) where.status = status;
    if (type) where.type = type;
    if (workflowId) where.workflow = { id: workflowId };

    const tasks = await this.taskService.findMany(where);

    return {
      tasks,
      total: tasks.length,
    };
  }

  private getEventPattern(taskType: TaskType): string {
    switch (taskType) {
      case TaskType.HTTP_REQUEST:
        return 'http.request';
      case TaskType.FETCH_ORDERS:
        return 'fetch.orders';
      case TaskType.CREATE_INVOICE:
        return 'create.invoice';
      case TaskType.GENERATE_PDF:
        return 'generate.pdf';
      case TaskType.SEND_EMAIL:
        return 'send.email';
      case TaskType.COMPENSATION:
        return 'compensation';
      case TaskType.DATA_PROCESSING:
        return 'data.processing';
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

  @Get(':id/with-logs')
  async getTaskWithLogs(@Param('id') id: string) {
    const task = await this.taskService.getTaskByIdWithLogs(id);
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    return task;
  }

  @Get(':id/with-workflow')
  async getTaskWithWorkflow(@Param('id') id: string) {
    const task = await this.taskService.getTaskByIdWithWorkflow(id);
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
}
