import { Module } from '@nestjs/common';
import { InvoiceController } from './invoice.controller';
import { InvoiceWorkflowService } from './invoice-workflow.service';
import { TaskModule } from '../task/task.module';
import { SchedulerModule } from '../scheduler/scheduler.module';

@Module({
  imports: [TaskModule, SchedulerModule],
  controllers: [InvoiceController],
  providers: [InvoiceWorkflowService],
  exports: [InvoiceWorkflowService],
})
export class InvoiceModule {}
