import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MessagingService } from './messaging.service';
import { RabbitMQSetupService } from './rabbitmq-setup.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [MessagingService, RabbitMQSetupService],
  exports: [MessagingService],
})
export class MessagingModule {}
