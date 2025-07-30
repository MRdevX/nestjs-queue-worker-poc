import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowEntity } from './workflow.entity';
import { WorkflowRepository } from './workflow.repository';
import { CoordinatorService } from './coordinator.service';
import { TaskModule } from '../task/task.module';

@Module({
  imports: [TypeOrmModule.forFeature([WorkflowEntity]), TaskModule],
  providers: [WorkflowRepository, CoordinatorService],
  exports: [CoordinatorService],
})
export class WorkflowModule {}
