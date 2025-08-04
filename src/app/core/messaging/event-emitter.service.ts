import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class EventEmitterService {
  private readonly logger = new Logger(EventEmitterService.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  async emitEvent(pattern: string, payload: any): Promise<void> {
    this.logger.log(`Emitting event to: ${pattern}`);
    this.eventEmitter.emit(pattern, payload);
    this.logger.log(`Event emitted to: ${pattern}`);
  }

  async publishTask(
    taskType: string,
    taskId: string,
    options?: any,
  ): Promise<void> {
    const pattern = this.getEventPattern(taskType);
    const message = {
      taskId,
      taskType,
      delay: options?.delay,
      metadata: options?.metadata,
    };

    this.logger.log(`Publishing task: ${taskType} - ${taskId}`);
    await this.emitEvent(pattern, message);
    this.logger.log(`Task published: ${taskType} - ${taskId}`);
  }

  private getEventPattern(taskType: string): string {
    const patterns = {
      http_request: 'http.request',
      data_processing: 'data.processing',
      compensation: 'compensation',
      fetch_orders: 'fetch.orders',
      create_invoice: 'create.invoice',
      generate_pdf: 'generate.pdf',
      send_email: 'send.email',
    };
    return patterns[taskType] || 'task.created';
  }
}
