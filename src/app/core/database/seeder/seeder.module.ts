import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskEntity } from '@root/app/task/task.entity';
import { TaskLogEntity } from '@root/app/task/task-log.entity';
import { WorkflowEntity } from '@root/app/workflow/workflow.entity';
import { DatabaseSeeder } from './database.seeder';
import { SeederController } from './seeder.controller';
import { SeederService } from './seeder.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TaskEntity, TaskLogEntity, WorkflowEntity]),
  ],
  providers: [DatabaseSeeder, SeederService],
  controllers: [SeederController],
  exports: [DatabaseSeeder, SeederService],
})
export class SeederModule {}
