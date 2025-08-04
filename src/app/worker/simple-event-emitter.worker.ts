import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class SimpleEventEmitterWorker {
  private readonly logger = new Logger(SimpleEventEmitterWorker.name);

  constructor() {
    this.logger.log('SimpleEventEmitterWorker initialized');
    this.logger.log('SimpleEventEmitterWorker listening for events');
  }

  @OnEvent('simple.test')
  async handleTest(data: any) {
    this.logger.log(
      `🎉 SIMPLE EVENT EMITTER WORKER RECEIVED MESSAGE: ${JSON.stringify(data)}`,
    );
    this.logger.log('✅ Simple event emitter worker is working!');
  }

  @OnEvent('fetch.orders')
  async handleFetchOrders(data: any) {
    this.logger.log(
      `🎉 FETCH ORDERS WORKER RECEIVED MESSAGE: ${JSON.stringify(data)}`,
    );
    this.logger.log('✅ Fetch orders worker is working!');
  }
}
