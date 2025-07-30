import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseRepository } from '../core/base/base.repositorty';
import { TaskLogEntity } from './task-log.entity';
import { LogLevel } from './types/log-level.enum';

@Injectable()
export class TaskLogRepository extends BaseRepository<TaskLogEntity> {
  constructor(
    @InjectRepository(TaskLogEntity)
    repository: Repository<TaskLogEntity>,
  ) {
    super(repository);
  }

  async createLogEntry(
    taskId: string,
    level: LogLevel,
    message: string,
  ): Promise<TaskLogEntity> {
    return this.create({
      task: { id: taskId },
      level,
      message,
      timestamp: new Date(),
    });
  }
}
