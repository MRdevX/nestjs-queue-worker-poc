import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowEntity } from './workflow.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WorkflowEntity])],
  providers: [],
  exports: [],
})
export class WorkflowModule {}
