import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowEntity } from './workflow.entity';
import { WorkflowRepository } from './workflow.repository';

@Module({
  imports: [TypeOrmModule.forFeature([WorkflowEntity])],
  providers: [WorkflowRepository],
  exports: [],
})
export class WorkflowModule {}
