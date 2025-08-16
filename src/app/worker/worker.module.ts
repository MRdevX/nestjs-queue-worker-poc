import { Module } from '@nestjs/common';
import { UnifiedWorker } from './unified.worker';
import { TaskProcessorService } from './task-processor.service';
import { TaskModule } from '../task/task.module';
import { WorkflowModule } from '../workflow/workflow.module';
import { InvoiceModule } from '../invoice/invoice.module';

@Module({
  imports: [TaskModule, WorkflowModule, InvoiceModule],
  providers: [UnifiedWorker, TaskProcessorService],
  exports: [UnifiedWorker, TaskProcessorService],
})
export class WorkerModule {}
