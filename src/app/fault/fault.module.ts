import { Module } from '@nestjs/common';
import { FaultService } from './fault.service';
import { FaultController } from './fault.controller';
import { TaskModule } from '../task/task.module';

@Module({
  imports: [TaskModule],
  providers: [FaultService],
  controllers: [FaultController],
  exports: [FaultService],
})
export class FaultModule {}
