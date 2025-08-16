import { Module } from '@nestjs/common';
import { TaskModule } from '../task/task.module';
import { QueueManagerModule } from '../queue/queue.module';
import { SchedulerService } from './scheduler.service';
import { SchedulerController } from './scheduler.controller';

@Module({
  imports: [TaskModule, QueueManagerModule],
  providers: [SchedulerService],
  controllers: [SchedulerController],
  exports: [SchedulerService],
})
export class SchedulerModule {}
