import { Module } from '@nestjs/common';
import { FaultService } from './fault.service';
import { TaskModule } from '../task/task.module';
import { MessagingModule } from '../core/messaging/messaging.module';

@Module({
  imports: [TaskModule, MessagingModule],
  providers: [FaultService],
  exports: [FaultService],
})
export class FaultModule {}
