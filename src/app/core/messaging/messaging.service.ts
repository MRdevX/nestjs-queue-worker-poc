import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy, ClientProxyFactory } from '@nestjs/microservices';
import { RmqOptions } from '@nestjs/microservices/interfaces';
import { TaskType } from '../../task/types/task-type.enum';
import { ITaskMessage } from './types/task-message.interface';

@Injectable()
export class MessagingService implements OnModuleDestroy {
  private readonly logger = new Logger(MessagingService.name);
  private readonly client: ClientProxy;

  constructor(private readonly configService: ConfigService) {
    this.client = this.createClient();
  }

  private createClient(): ClientProxy {
    const s2sConfig = this.configService.get('s2s');
    return ClientProxyFactory.create({
      transport: s2sConfig.transport,
      options: {
        urls: s2sConfig.options.urls,
        noAck: s2sConfig.options.noAck,
        prefetchCount: s2sConfig.options.prefetchCount,
        persistent: s2sConfig.options.persistent,
        queueOptions: s2sConfig.options.queueOptions,
      },
    } as RmqOptions);
  }

  private getEventPattern(taskType: TaskType): string {
    const patterns = {
      [TaskType.HTTP_REQUEST]: 'http.request',
      [TaskType.DATA_PROCESSING]: 'data.processing',
      [TaskType.COMPENSATION]: 'compensation',
      [TaskType.FETCH_ORDERS]: 'fetch.orders',
      [TaskType.CREATE_INVOICE]: 'create.invoice',
      [TaskType.GENERATE_PDF]: 'generate.pdf',
      [TaskType.SEND_EMAIL]: 'send.email',
    };
    return patterns[taskType] || 'task.created';
  }

  async publishTask(
    taskType: TaskType,
    taskId: string,
    options?: { delay?: number; metadata?: Record<string, any> },
  ): Promise<void> {
    const pattern = this.getEventPattern(taskType);
    const message: ITaskMessage = {
      taskId,
      taskType,
      delay: options?.delay,
      metadata: options?.metadata,
    };

    this.logger.log(`Publishing task: ${taskType} - ${taskId}`);
    await this.emitEvent(pattern, message);
    this.logger.log(`Task published: ${taskType} - ${taskId}`);
  }

  async emitEvent(
    pattern: string,
    payload: any,
    options?: { delay?: number; metadata?: Record<string, any> },
  ): Promise<void> {
    const message = {
      ...payload,
      delay: options?.delay,
      metadata: options?.metadata,
    };

    this.logger.log(`Emitting event to: ${pattern}`);

    try {
      this.client.emit(pattern, message);
      this.logger.log(`Event emitted to: ${pattern}`);
    } catch (error) {
      this.logger.error(`Failed to emit event to ${pattern}:`, error.stack);
      throw new Error(`Event emit failed: ${error.message || 'Unknown error'}`);
    }
  }

  async onModuleDestroy() {
    try {
      await this.client.close();
      this.logger.log('Disconnected from RabbitMQ');
    } catch (error) {
      this.logger.error('Failed to disconnect from RabbitMQ:', error.stack);
    }
  }
}
