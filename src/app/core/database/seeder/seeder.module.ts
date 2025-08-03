import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseSeeder } from './database.seeder';
import { SeederController } from './seeder.controller';
import { SeederService } from './seeder.service';
import { TaskEntity } from '../../task/task.entity';
import { TaskLogEntity } from '../../task/task-log.entity';
import { WorkflowEntity } from '../../workflow/workflow.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([TaskEntity, TaskLogEntity, WorkflowEntity]),
  ],
  providers: [DatabaseSeeder, SeederService],
  controllers: [SeederController],
  exports: [DatabaseSeeder, SeederService],
})
export class SeederModule {}
