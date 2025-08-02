import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { InvoiceController } from './invoice.controller';
import { InvoiceService } from './invoice.service';
import { InvoiceWorkflowService } from './invoice-workflow.service';
import { TaskModule } from '../task/task.module';
import { SchedulerModule } from '../scheduler/scheduler.module';
import invoiceConfig from '../config/invoice.config';

@Module({
  imports: [
    TaskModule,
    SchedulerModule,
    ConfigModule.forFeature(invoiceConfig),
  ],
  controllers: [InvoiceController],
  providers: [InvoiceService, InvoiceWorkflowService],
  exports: [InvoiceService, InvoiceWorkflowService],
})
export class InvoiceModule {}
