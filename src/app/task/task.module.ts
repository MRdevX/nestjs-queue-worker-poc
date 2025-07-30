import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskEntity } from './task.entity';
import { TaskLogEntity } from './task-log.entity';
import { TaskRepository } from './task.repository';
import { TaskLogRepository } from './task-log.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TaskEntity,
      TaskLogEntity,
      TaskRepository,
      TaskLogRepository,
    ]),
  ],
  providers: [],
  exports: [],
})
export class TaskModule {}
