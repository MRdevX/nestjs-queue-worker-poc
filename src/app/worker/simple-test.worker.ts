import { Injectable, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';

@Injectable()
export class SimpleTestWorker {
  private readonly logger = new Logger(SimpleTestWorker.name);

  constructor() {
    this.logger.log('SimpleTestWorker initialized');
    this.logger.log('SimpleTestWorker listening for events');
  }

  @EventPattern('simple.test')
  async handleTest(@Payload() data: any) {
    this.logger.log(
      `🎉 SIMPLE TEST WORKER RECEIVED MESSAGE: ${JSON.stringify(data)}`,
    );
    this.logger.log('✅ Simple test worker is working!');
  }
}
