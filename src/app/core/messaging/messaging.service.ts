import { firstValueFrom } from 'rxjs';
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
        queue: s2sConfig.options.queue,
        queueOptions: s2sConfig.options.queueOptions,
      },
    } as RmqOptions);
  }

  getClient(): ClientProxy {
    return this.client;
  }

  private getMessagePattern(taskType: TaskType): string {
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
    const pattern = this.getMessagePattern(taskType);
    const message: ITaskMessage = {
      taskId,
      taskType,
      delay: options?.delay,
      metadata: options?.metadata,
    };

    this.logger.log(`Publishing task: ${taskType} - ${taskId}`);
    await this.sendMessage(pattern, message);
    this.logger.log(`Task published: ${taskType} - ${taskId}`);
  }

  async sendMessage<T = any>(pattern: string, payload: any): Promise<T> {
    this.logger.log(`Sending message to: ${pattern}`);

    try {
      const response = await firstValueFrom(this.client.send(pattern, payload));
      this.logger.log(`Message sent to: ${pattern}`);
      return response as T;
    } catch (error) {
      this.logger.error(`Failed to send message to ${pattern}:`, error.stack);
      throw new Error(
        `Message send failed: ${error.message || 'Unknown error'}`,
      );
    }
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

  async connect(): Promise<void> {
    try {
      await this.client.connect();
      this.logger.log('Connected to RabbitMQ');
    } catch (error) {
      this.logger.error('Failed to connect to RabbitMQ:', error.stack);
      throw new Error(`Connection failed: ${error.message}`);
    }
  }

  async close(): Promise<void> {
    try {
      await this.client.close();
      this.logger.log('Disconnected from RabbitMQ');
    } catch (error) {
      this.logger.error('Failed to disconnect from RabbitMQ:', error.stack);
    }
  }

  async onModuleDestroy() {
    await this.close();
  }
}
