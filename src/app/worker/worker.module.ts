import { Module } from '@nestjs/common';
import { DataWorker } from './data.worker';
import { HttpWorker } from './http.worker';
import { CompensationWorker } from './compensation.worker';
import { TaskModule } from '../task/task.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [TaskModule, WorkflowModule],
  providers: [DataWorker, HttpWorker, CompensationWorker],
  exports: [DataWorker, HttpWorker, CompensationWorker],
})
export class WorkerModule {}
