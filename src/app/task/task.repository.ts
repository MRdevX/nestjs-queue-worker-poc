import { Repository } from 'typeorm';
import { BaseRepository } from '../core/base/base.repositorty';
import { TaskEntity } from './task.entity';
import { TaskStatus } from './types/task-status.enum';

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

  async incrementRetryCount(id: string): Promise<void> {
    await this.repository.increment({ id }, 'retries', 1);
  }

  async findChildrenTasks(parentId: string): Promise<TaskEntity[]> {
    return this.repository.find({
      where: { parentTask: { id: parentId } },
      relations: ['children'],
    });
  }

  async updateStatus(id: string, status: TaskStatus): Promise<TaskEntity> {
    const updatedTask = await this.update(id, { status });
    if (!updatedTask) {
      throw new Error(`Task with id ${id} not found.`);
    }
    return updatedTask;
  }
}
