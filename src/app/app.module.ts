import { Module } from '@nestjs/common';
import { CoreModule } from './core/core.module';
import { TaskModule } from './task/task.module';
import { WorkflowModule } from './workflow/workflow.module';

@Module({
  imports: [CoreModule, TaskModule, WorkflowModule],
})
export class AppModule {}
