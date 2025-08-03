import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowEntity } from './workflow.entity';
import { WorkflowRepository } from './workflow.repository';
import { CoordinatorService } from './coordinator.service';
import { WorkflowController } from './workflow.controller';
import { WorkflowService } from './workflow.service';
import { TaskModule } from '../task/task.module';
import { MessagingModule } from '../core/messaging/messaging.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([WorkflowEntity]),
    TaskModule,
    MessagingModule,
  ],
  providers: [WorkflowRepository, CoordinatorService, WorkflowService],
  controllers: [WorkflowController],
  exports: [WorkflowRepository, CoordinatorService, WorkflowService],
})
export class WorkflowModule {}
