import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { InvoiceController } from './invoice.controller';
import { InvoiceService } from './invoice.service';
import { InvoiceWorkflowService } from './invoice-workflow.service';
import { InvoiceCoordinatorService } from './invoice-coordinator.service';
import { TaskModule } from '../task/task.module';
import { SchedulerModule } from '../scheduler/scheduler.module';
import { MessagingModule } from '../core/messaging/messaging.module';
import invoiceConfig from '../config/invoice.config';

@Module({
  imports: [
    TaskModule,
    SchedulerModule,
    MessagingModule,
    ConfigModule.forFeature(invoiceConfig),
  ],
  controllers: [InvoiceController],
  providers: [
    InvoiceService,
    InvoiceWorkflowService,
    InvoiceCoordinatorService,
  ],
  exports: [InvoiceService, InvoiceWorkflowService, InvoiceCoordinatorService],
})
export class InvoiceModule {}
