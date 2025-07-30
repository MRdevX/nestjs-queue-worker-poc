import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskEntity } from './task.entity';
import { TaskExecutionLog } from './task-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TaskEntity, TaskExecutionLog])],
  providers: [],
  exports: [],
})
export class TaskModule {}
