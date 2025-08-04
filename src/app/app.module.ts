import { Module } from '@nestjs/common';
import { CoreModule } from './core/core.module';
import { TaskModule } from './task/task.module';
import { WorkflowModule } from './workflow/workflow.module';
import { WorkerModule } from './worker/worker.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { QueueManagerModule } from './queue/queue.module';
import { InvoiceModule } from './invoice/invoice.module';
import { TestModule } from './core/test/test.module';

@Module({
  imports: [
    CoreModule,
    TaskModule,
    WorkflowModule,
    WorkerModule,
    SchedulerModule,
    QueueManagerModule,
    InvoiceModule,
    TestModule,
  ],
})
export class AppModule {}
