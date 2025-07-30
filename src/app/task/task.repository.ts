import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../core/base/base.repositorty';
import { TaskEntity } from './task.entity';
import { TaskStatus } from './types/task-status.enum';

@Injectable()
export class TaskRepository extends BaseRepository<TaskEntity> {
  constructor(repository: Repository<TaskEntity>) {
    super(repository);
  }

  async findPendingTasks(limit = 100): Promise<TaskEntity[]> {
    return this.repository.find({
      where: { status: TaskStatus.PENDING },
      order: { createdAt: 'ASC' },
      take: limit,
    });
  }

  async updateTaskStatus(
    taskId: string,
    status: TaskStatus,
    error?: string,
  ): Promise<void> {
    const updateData: any = { status };
    if (error) {
      updateData.error = error;
    }
    await this.update(taskId, updateData);
  }

  async incrementRetryCount(taskId: string): Promise<void> {
    await this.repository.increment({ id: taskId }, 'retries', 1);
  }
}
