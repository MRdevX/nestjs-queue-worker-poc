import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskEntity } from './task.entity';
import { TaskLogEntity } from './task-log.entity';
import { TaskRepository } from './task.repository';
import { TaskLogRepository } from './task-log.repository';
import { TaskService } from './task.service';
import { TaskController } from './task.controller';
import { QueueController } from './queue.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TaskEntity, TaskLogEntity])],
  providers: [TaskService, TaskRepository, TaskLogRepository],
  exports: [TaskService, TaskRepository],
  controllers: [TaskController, QueueController],
})
export class TaskModule {}
