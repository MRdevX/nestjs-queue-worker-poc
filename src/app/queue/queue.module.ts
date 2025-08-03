import { Module } from '@nestjs/common';
import { QueueManagerService } from './queue-manager.service';
import { QueueManagerController } from './queue-manager.controller';
import { TaskModule } from '../task/task.module';
import { MessagingModule } from '../core/messaging/messaging.module';

@Module({
  imports: [TaskModule, MessagingModule],
  providers: [QueueManagerService],
  controllers: [QueueManagerController],
  exports: [QueueManagerService],
})
export class QueueManagerModule {}
