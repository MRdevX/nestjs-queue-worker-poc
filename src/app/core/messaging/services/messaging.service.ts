import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TaskType } from '../../../task/types/task-type.enum';
import { ITaskMessage } from '../types/task-message.interface';
import {
  IMessagingService,
  IMessagingProvider,
  IMessagingOptions,
} from '../types/messaging.interface';
import { getEventPattern } from '../constants/event-patterns.constants';
import { MessagingFactoryService } from './messaging-factory.service';

@Injectable()
export class MessagingService
  implements IMessagingService, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(MessagingService.name);
  private provider: IMessagingProvider;

  constructor(
    private readonly configService: ConfigService,
    private readonly messagingFactory: MessagingFactoryService,
  ) {}

  async onModuleInit() {
    this.provider = this.messagingFactory.createProvider();
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  async connect(): Promise<void> {
    await this.provider.connect();
  }

  async disconnect(): Promise<void> {
    await this.provider.disconnect();
  }

  async publishTask(
    taskType: TaskType,
    taskId: string,
    options?: IMessagingOptions,
  ): Promise<void> {
    const pattern = getEventPattern(taskType);
    const message: ITaskMessage = {
      taskId,
      taskType,
      delay: options?.delay,
      metadata: options?.metadata,
      retryCount: options?.metadata?.retryCount,
      originalTaskId: options?.metadata?.originalTaskId,
      workflowId: options?.metadata?.workflowId,
      scheduledAt: options?.metadata?.scheduledAt,
    };

    await this.emitEvent(pattern, message);
  }

  async emitEvent(
    pattern: string,
    payload: any,
    options?: IMessagingOptions,
  ): Promise<void> {
    const message = {
      ...payload,
      delay: payload.delay !== undefined ? payload.delay : options?.delay,
      metadata:
        payload.metadata !== undefined ? payload.metadata : options?.metadata,
    };

    await this.provider.emit(pattern, message);
  }

  isConnected(): boolean {
    return this.provider.isConnected();
  }
}
