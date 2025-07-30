import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskEntity } from './task.entity';
import { TaskLogEntity } from './task-log.entity';
import { TaskRepository } from './task.repository';
import { TaskLogRepository } from './task-log.repository';
import { TaskService } from './task.service';

@Module({
  imports: [TypeOrmModule.forFeature([TaskEntity, TaskLogEntity])],
  providers: [TaskService, TaskRepository, TaskLogRepository],
  exports: [TaskService],
})
export class TaskModule {}
