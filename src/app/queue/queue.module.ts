import { Module } from '@nestjs/common';
import { QueueManagerService } from './queue-manager.service';
import { QueueManagerController } from './queue-manager.controller';
import { TaskQueueService } from './task-queue.service';
import { TaskModule } from '../task/task.module';
import { MessagingModule } from '../core/messaging/messaging.module';

@Module({
  imports: [TaskModule, MessagingModule],
  providers: [QueueManagerService, TaskQueueService],
  controllers: [QueueManagerController],
  exports: [QueueManagerService, TaskQueueService],
})
export class QueueManagerModule {}
