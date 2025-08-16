import { Module } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { InvoiceController } from './invoice.controller';
import { InvoiceWorkflowService } from './invoice-workflow.service';
import { InvoiceCoordinatorService } from './invoice-coordinator.service';
import { TaskModule } from '../task/task.module';
import { QueueManagerModule } from '../queue/queue.module';
import { SchedulerModule } from '../scheduler/scheduler.module';

@Module({
  imports: [TaskModule, QueueManagerModule, SchedulerModule],
  providers: [
    InvoiceService,
    InvoiceWorkflowService,
    InvoiceCoordinatorService,
  ],
  controllers: [InvoiceController],
  exports: [InvoiceService, InvoiceWorkflowService, InvoiceCoordinatorService],
})
export class InvoiceModule {}
