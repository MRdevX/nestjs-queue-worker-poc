import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowEntity } from './workflow.entity';
import { WorkflowRepository } from './workflow.repository';
import { CoordinatorFactoryService } from './services/coordinator-factory.service';
import { WorkflowController } from './workflow.controller';
import { WorkflowExecutionService } from './services/workflow-execution.service';
import { WorkflowCoordinationService } from './services/workflow-coordination.service';
import { WorkflowResponseService } from './services/workflow-response.service';
import { TaskStatisticsService } from './services/task-statistics.service';
import { DefaultTransitionStrategy } from './strategies/default-transition.strategy';
import { TaskModule } from '../task/task.module';
import { QueueManagerModule } from '../queue/queue.module';
import { InvoiceModule } from '../invoice/invoice.module';
import { CoordinatorService } from './services/coordinator.service';
import { WorkflowService } from './services/workflow.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([WorkflowEntity]),
    TaskModule,
    QueueManagerModule,
    InvoiceModule,
  ],
  providers: [
    WorkflowRepository,
    WorkflowService,
    CoordinatorService,
    CoordinatorFactoryService,
    WorkflowExecutionService,
    WorkflowCoordinationService,
    WorkflowResponseService,
    TaskStatisticsService,
    DefaultTransitionStrategy,
    {
      provide: 'IWorkflowTransitionStrategy',
      useExisting: DefaultTransitionStrategy,
    },
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
