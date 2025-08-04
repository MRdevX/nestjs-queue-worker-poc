import { Module } from '@nestjs/common';
import { DataWorker } from './data.worker';
import { HttpWorker } from './http.worker';
import { CompensationWorker } from './compensation.worker';
import { FetchOrdersWorker } from './fetch-orders.worker';
import { CreateInvoiceWorker } from './create-invoice.worker';
import { GeneratePdfWorker } from './generate-pdf.worker';
import { SendEmailWorker } from './send-email.worker';
import { SimpleTestWorker } from './simple-test.worker';
import { SimpleEventEmitterWorker } from './simple-event-emitter.worker';
import { TaskModule } from '../task/task.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [TaskModule, WorkflowModule],
  providers: [
    DataWorker,
    HttpWorker,
    CompensationWorker,
    FetchOrdersWorker,
    CreateInvoiceWorker,
    GeneratePdfWorker,
    SendEmailWorker,
    SimpleTestWorker,
    SimpleEventEmitterWorker,
  ],
  exports: [
    DataWorker,
    HttpWorker,
    CompensationWorker,
    FetchOrdersWorker,
    CreateInvoiceWorker,
    GeneratePdfWorker,
    SendEmailWorker,
    SimpleTestWorker,
    SimpleEventEmitterWorker,
  ],
})
export class WorkerModule {}
