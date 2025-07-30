import { Repository } from 'typeorm';
import { BaseRepository } from '../core/base/base.repositorty';
import { TaskExecutionLog } from './task-log.entity';
import { LogLevel } from './types/log-level.enum';

export class TaskLogRepository extends BaseRepository<TaskExecutionLog> {
  constructor(repository: Repository<TaskExecutionLog>) {
    super(repository);
  }

  async createLogEntry(taskId: string, level: LogLevel, message: string) {
    return this.create({
      task: { id: taskId },
      level,
      message,
      timestamp: new Date(),
    });
  }

  async getTaskTimeline(taskId: string): Promise<TaskExecutionLog[]> {
    return this.repository.find({
      where: { task: { id: taskId } },
      order: { timestamp: 'DESC' },
    });
  }
}
