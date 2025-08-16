import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { TaskRepository } from './task.repository';
import { TaskType } from './types/task-type.enum';
import { TaskEntity } from './task.entity';
import { TaskStatus } from './types/task-status.enum';
import { TaskFiltersDto } from './types/task.dto';

@Injectable()
export class TaskService {
  constructor(private taskRepo: TaskRepository) {}

  private validateTaskId(taskId: string): void {
    if (!taskId?.trim()) {
      throw new BadRequestException('Task ID is required');
    }
  }

  private async findTaskOrThrow(taskId: string): Promise<TaskEntity> {
    this.validateTaskId(taskId);
    const task = await this.taskRepo.findById(taskId);
    if (!task) {
      throw new NotFoundException(`Task with id ${taskId} not found`);
    }
    return task;
  }

  async createTask(
    type: TaskType,
    payload: Record<string, any>,
    workflowId?: string,
  ): Promise<TaskEntity> {
    if (!type || !payload) {
      throw new BadRequestException('Task type and payload are required');
    }

    const taskData = {
      type,
      payload,
      status: TaskStatus.PENDING,
      workflow: workflowId ? { id: workflowId } : undefined,
    };

    return this.taskRepo.create(taskData);
  }

  async updateTaskStatus(
    taskId: string,
    status: TaskStatus,
    error?: string,
  ): Promise<TaskEntity> {
    if (!status) {
      throw new BadRequestException('Status is required');
    }

    const task = await this.findTaskOrThrow(taskId);
    await this.taskRepo.updateTaskStatus(taskId, status, error);

    const updatedTask = await this.taskRepo.findById(taskId);
    if (!updatedTask) {
      throw new NotFoundException(
        `Task with id ${taskId} not found after update`,
      );
    }
    return updatedTask;
  }

  async handleFailure(taskId: string, error: Error): Promise<void> {
    const task = await this.findTaskOrThrow(taskId);

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

  async cancelTask(taskId: string): Promise<TaskEntity> {
    const task = await this.findTaskOrThrow(taskId);

    if (task.status !== TaskStatus.PENDING) {
      throw new BadRequestException('Only pending tasks can be cancelled');
    }

    return this.updateTaskStatus(taskId, TaskStatus.CANCELLED);
  }

  async getTaskById(taskId: string, relations?: string[]): Promise<TaskEntity> {
    this.validateTaskId(taskId);

    if (relations?.length) {
      const task = await this.taskRepo.findByIdWithRelations(taskId, relations);
      if (!task) {
        throw new NotFoundException(`Task with id ${taskId} not found`);
      }
      return task;
    }

    return this.findTaskOrThrow(taskId);
  }

  async findTasks(filters?: TaskFiltersDto): Promise<TaskEntity[]> {
    const where: Record<string, any> = {};

    if (filters?.status) where.status = filters.status;
    if (filters?.type) where.type = filters.type;
    if (filters?.workflowId) where.workflow = { id: filters.workflowId };

    return this.taskRepo.findMany(where);
  }

  async getPendingTasks(limit = 100): Promise<TaskEntity[]> {
    return this.taskRepo.findPendingTasks(limit);
  }

  async updateTaskPayload(
    taskId: string,
    payload: Record<string, any>,
  ): Promise<TaskEntity> {
    this.validateTaskId(taskId);
    await this.taskRepo.update(taskId, { payload });
    return this.findTaskOrThrow(taskId);
  }
}
