import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { TaskRepository } from './task.repository';
import { TaskLogRepository } from './task-log.repository';
import { TaskType } from './types/task-type.enum';
import { TaskEntity } from './task.entity';
import { TaskStatus } from './types/task-status.enum';
import { LogLevel } from './types/log-level.enum';

@Injectable()
export class TaskService {
  constructor(
    private taskRepo: TaskRepository,
    private logRepo: TaskLogRepository,
  ) {}

  async createTask(
    type: TaskType,
    payload: any,
    workflowId?: string,
  ): Promise<TaskEntity> {
    if (!type || !payload) {
      throw new BadRequestException('Task type and payload are required');
    }

    const task = await this.taskRepo.create({
      type,
      payload,
      status: TaskStatus.PENDING,
      workflow: workflowId ? { id: workflowId } : undefined,
    });

    await this.logRepo.createLogEntry(task.id, LogLevel.INFO, 'Task created');

    return task;
  }

  async updateTaskStatus(
    taskId: string,
    status: TaskStatus,
    error?: string,
  ): Promise<TaskEntity | null> {
    if (!taskId || !status) {
      throw new BadRequestException('Task ID and status are required');
    }

    await this.taskRepo.updateTaskStatus(taskId, status, error);

    const logLevel =
      status === TaskStatus.FAILED ? LogLevel.ERROR : LogLevel.INFO;
    const message = error
      ? `Task ${status.toLowerCase()}: ${error}`
      : `Task status updated to ${status}`;

    await this.logRepo.createLogEntry(taskId, logLevel, message);

    return this.taskRepo.findById(taskId);
  }

  async handleFailure(taskId: string, error: Error): Promise<void> {
    if (!taskId) {
      throw new BadRequestException('Task ID is required');
    }

    const task = await this.taskRepo.findById(taskId);
    if (!task) {
      throw new NotFoundException(`Task with id ${taskId} not found`);
    }

    await this.taskRepo.incrementRetryCount(taskId);

    const updatedTask = await this.taskRepo.findById(taskId);
    if (!updatedTask) {
      throw new NotFoundException(
        `Task with id ${taskId} not found after retry increment`,
      );
    }

    const newStatus =
      updatedTask.retries >= updatedTask.maxRetries
        ? TaskStatus.FAILED
        : TaskStatus.PENDING;

    await this.updateTaskStatus(taskId, newStatus, error.message);
  }

  async cancelTask(taskId: string): Promise<TaskEntity | null> {
    if (!taskId) {
      throw new BadRequestException('Task ID is required');
    }

    const task = await this.taskRepo.findById(taskId);
    if (!task) {
      throw new NotFoundException(`Task with id ${taskId} not found`);
    }

    if (task.status !== TaskStatus.PENDING) {
      throw new BadRequestException('Only pending tasks can be cancelled');
    }

    await this.logRepo.createLogEntry(
      taskId,
      LogLevel.INFO,
      'Task cancelled by user',
    );

    return this.updateTaskStatus(taskId, TaskStatus.CANCELLED);
  }

  async getPendingTasks(limit = 100): Promise<TaskEntity[]> {
    return this.taskRepo.findPendingTasks(limit);
  }

  async findMany(where: any): Promise<TaskEntity[]> {
    return this.taskRepo.findMany(where);
  }

  async getTaskById(
    taskId: string,
    options?: { relations?: string[] },
  ): Promise<TaskEntity | null> {
    if (!taskId) {
      throw new BadRequestException('Task ID is required');
    }

    if (options?.relations) {
      return this.taskRepo.findByIdWithRelations(taskId, options.relations);
    }

    return this.taskRepo.findById(taskId);
  }

  async getTaskByIdWithWorkflow(taskId: string): Promise<TaskEntity | null> {
    if (!taskId) {
      throw new BadRequestException('Task ID is required');
    }
    return this.taskRepo.findByIdWithRelations(taskId, ['workflow']);
  }

  async getTaskByIdWithLogs(taskId: string): Promise<TaskEntity | null> {
    if (!taskId) {
      throw new BadRequestException('Task ID is required');
    }
    return this.taskRepo.findByIdWithRelations(taskId, ['logs']);
  }

  async updateTaskPayload(
    taskId: string,
    payload: any,
  ): Promise<TaskEntity | null> {
    if (!taskId) {
      throw new BadRequestException('Task ID is required');
    }

    await this.taskRepo.update(taskId, { payload });
    await this.logRepo.createLogEntry(
      taskId,
      LogLevel.INFO,
      'Task payload updated',
    );

    return this.taskRepo.findById(taskId);
  }
}
