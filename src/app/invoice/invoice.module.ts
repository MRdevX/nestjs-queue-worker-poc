import { Module } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { InvoiceController } from './invoice.controller';
import { InvoiceCoordinatorService } from './invoice-coordinator.service';
import { TaskModule } from '../task/task.module';
import { QueueManagerModule } from '../queue/queue.module';
import { SchedulerModule } from '../scheduler/scheduler.module';

@Module({
  imports: [TaskModule, QueueManagerModule, SchedulerModule],
  providers: [InvoiceService, InvoiceCoordinatorService],
  controllers: [InvoiceController],
  exports: [InvoiceService, InvoiceCoordinatorService],
})
export class InvoiceModule {}
