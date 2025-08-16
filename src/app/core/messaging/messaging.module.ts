import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MessagingService } from './messaging.service';
import { EventEmitterService } from './event-emitter.service';
import { RabbitMQSetupService } from './rabbitmq-setup.service';
import { NatsSetupService } from './nats-setup.service';
import { RabbitMQProvider } from './providers/rabbitmq.provider';
import { NatsProvider } from './providers/nats.provider';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    MessagingService,
    EventEmitterService,
    RabbitMQSetupService,
    NatsSetupService,
    RabbitMQProvider,
    NatsProvider,
  ],
  exports: [MessagingService, EventEmitterService],
})
export class MessagingModule {}
