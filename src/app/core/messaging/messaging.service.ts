import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TaskType } from '../../task/types/task-type.enum';
import { ITaskMessage } from './types/task-message.interface';
import {
  IMessagingService,
  IMessagingProvider,
  IMessagingConfig,
} from './types/messaging.interface';
import { MessagingProviderFactory } from './providers/messaging-provider.factory';

@Injectable()
export class MessagingService
  implements IMessagingService, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(MessagingService.name);
  private provider: IMessagingProvider;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const config = this.getMessagingConfig();
    this.provider = MessagingProviderFactory.createProvider(config);
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private getMessagingConfig(): IMessagingConfig {
    const s2sConfig = this.configService.get('s2s');
    return {
      transport: s2sConfig.transport === 'nats' ? 'nats' : 'rmq',
      options: {
        urls: s2sConfig.options.urls,
        servers: s2sConfig.options.servers,
        queue: s2sConfig.options.queue,
        queueOptions: s2sConfig.options.queueOptions,
        ...s2sConfig.options,
      },
    };
  }

  async connect(): Promise<void> {
    await this.provider.connect();
  }

  async disconnect(): Promise<void> {
    await this.provider.disconnect();
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
      delay: payload.delay !== undefined ? payload.delay : options?.delay,
      metadata:
        payload.metadata !== undefined ? payload.metadata : options?.metadata,
    };

    this.logger.log(`Emitting event to: ${pattern}`);
    await this.provider.emit(pattern, message);
    this.logger.log(`Event emitted to: ${pattern}`);
  }

  isConnected(): boolean {
    return this.provider.isConnected();
  }
}
