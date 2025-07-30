import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MessagingService } from './messaging.service';
import { TaskModule } from '../../task/task.module';

@Module({
  imports: [ConfigModule, TaskModule],
  providers: [MessagingService],
  exports: [MessagingService],
})
export class MessagingModule {}
