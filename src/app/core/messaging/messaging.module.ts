import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MessagingService } from './messaging.service';
import { EventEmitterService } from './event-emitter.service';
import { RabbitMQSetupService } from './rabbitmq-setup.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [MessagingService, EventEmitterService, RabbitMQSetupService],
  exports: [MessagingService, EventEmitterService],
})
export class MessagingModule {}
