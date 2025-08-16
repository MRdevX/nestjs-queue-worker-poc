import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowEntity } from './workflow.entity';
import { WorkflowRepository } from './workflow.repository';
import { WorkflowController } from './workflow.controller';
import { TaskModule } from '../task/task.module';
import { QueueManagerModule } from '../queue/queue.module';
import { WorkflowService } from './services/workflow.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([WorkflowEntity]),
    TaskModule,
    QueueManagerModule,
  ],
  providers: [WorkflowRepository, WorkflowService],
  controllers: [WorkflowController],
  exports: [WorkflowRepository, WorkflowService],
})
export class WorkflowModule {}
