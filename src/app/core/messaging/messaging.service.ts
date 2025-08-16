import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TaskType } from '../../task/types/task-type.enum';
import { ITaskMessage } from './types/task-message.interface';
import {
  IMessagingService,
  IMessagingProvider,
  IMessagingConfig,
  MessagingOptions,
} from './types/messaging.interface';
import { getEventPattern } from './constants/event-patterns.constants';

@Injectable()
export class MessagingService
  implements IMessagingService, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(MessagingService.name);
  private provider: IMessagingProvider;

  constructor(
    private readonly configService: ConfigService,
    @Inject('ACTIVE_PROVIDER') private readonly ProviderClass: any,
    @Inject('ACTIVE_SETUP_SERVICE') private readonly SetupServiceClass: any,
  ) {}

  async onModuleInit() {
    await this.setupInfrastructure();
    await this.initializeProvider();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private async setupInfrastructure(): Promise<void> {
    try {
      const transport = this.configService.get('s2s.transport');
      this.logger.log(`Setting up ${transport} infrastructure...`);

      const setupService = new this.SetupServiceClass(this.configService);
      await setupService.setup();

      this.logger.log(`${transport} infrastructure setup completed`);
    } catch (error) {
      this.logger.warn('Infrastructure setup failed, continuing without setup');
    }
  }

  private async initializeProvider(): Promise<void> {
    const config = this.getMessagingConfig();
    this.provider = new this.ProviderClass(config);
    await this.connect();
  }

  private getMessagingConfig(): IMessagingConfig {
    const s2sConfig = this.configService.get('s2s');
    return {
      transport: s2sConfig.transport,
      options: s2sConfig.options,
    };
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
    options?: MessagingOptions,
  ): Promise<void> {
    const pattern = getEventPattern(taskType);
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
    options?: MessagingOptions,
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
