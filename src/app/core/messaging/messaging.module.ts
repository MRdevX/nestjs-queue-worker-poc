import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MessagingService } from './services/messaging.service';
import { MessagingFactoryService } from './services/messaging-factory.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [MessagingService, MessagingFactoryService],
  exports: [MessagingService],
})
export class MessagingModule {}
