import { Module } from '@nestjs/common';
import { FaultService } from './fault.service';
import { TaskModule } from '../task/task.module';

@Module({
  imports: [TaskModule],
  providers: [FaultService],
  exports: [FaultService],
})
export class FaultModule {}
