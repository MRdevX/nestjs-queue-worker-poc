import { Module } from '@nestjs/common';
import { CoreModule } from './core/core.module';
import { TaskModule } from './task/task.module';
import { WorkflowModule } from './workflow/workflow.module';
import { WorkerModule } from './worker/worker.module';

@Module({
  imports: [CoreModule, TaskModule, WorkflowModule, WorkerModule],
})
export class AppModule {}
