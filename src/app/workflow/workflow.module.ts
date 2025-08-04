import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowEntity } from './workflow.entity';
import { WorkflowRepository } from './workflow.repository';
import { CoordinatorService } from './coordinator.service';
import { CoordinatorFactoryService } from './coordinator-factory.service';
import { WorkflowController } from './workflow.controller';
import { WorkflowService } from './workflow.service';
import { TaskModule } from '../task/task.module';
import { MessagingModule } from '../core/messaging/messaging.module';
import { InvoiceModule } from '../invoice/invoice.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([WorkflowEntity]),
    TaskModule,
    MessagingModule,
    InvoiceModule,
  ],
  providers: [
    WorkflowRepository,
    CoordinatorService,
    CoordinatorFactoryService,
    WorkflowService,
  ],
  controllers: [WorkflowController],
  exports: [
    WorkflowRepository,
    CoordinatorService,
    CoordinatorFactoryService,
    WorkflowService,
  ],
})
export class WorkflowModule {}
