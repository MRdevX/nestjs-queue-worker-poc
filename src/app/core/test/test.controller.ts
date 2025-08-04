import { Controller, Post, Logger } from '@nestjs/common';
import { MessagingService } from '../messaging/messaging.service';
import { EventEmitterService } from '../messaging/event-emitter.service';

@Controller('test')
export class TestController {
  private readonly logger = new Logger(TestController.name);

  constructor(
    private readonly messagingService: MessagingService,
    private readonly eventEmitterService: EventEmitterService,
  ) {}

  @Post('simple')
  async testSimpleWorker() {
    this.logger.log('🧪 Testing simple worker...');

    const testMessage = {
      message: 'Hello from test controller!',
      timestamp: new Date().toISOString(),
      testId: Math.random().toString(36).substr(2, 9),
    };

    this.logger.log(`📤 Emitting test message: ${JSON.stringify(testMessage)}`);

    // Test both RabbitMQ and EventEmitter
    await this.messagingService.emitEvent('simple.test', testMessage);
    await this.eventEmitterService.emitEvent('simple.test', testMessage);

    this.logger.log('✅ Test message emitted');

    return {
      message: 'Test message sent to simple worker',
      testMessage,
    };
  }
}