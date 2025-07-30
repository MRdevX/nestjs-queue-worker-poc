import { Module } from '@nestjs/common';
import { DataWorker } from './data.worker';
import { HttpWorker } from './http.worker';
import { TaskModule } from '../task/task.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [TaskModule, WorkflowModule],
  providers: [DataWorker, HttpWorker],
  exports: [DataWorker, HttpWorker],
})
export class WorkerModule {}
