import { Module } from '@nestjs/common';
import { CoreModule } from './core/core.module';
import { TaskModule } from './task/task.module';
import { WorkflowModule } from './workflow/workflow.module';
import { WorkerModule } from './worker/worker.module';
import { FaultModule } from './fault/fault.module';
import { SchedulerModule } from './scheduler/scheduler.module';

@Module({
  imports: [
    CoreModule,
    TaskModule,
    WorkflowModule,
    WorkerModule,
    FaultModule,
    SchedulerModule,
  ],
})
export class AppModule {}
