import { firstValueFrom } from 'rxjs';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy, ClientProxyFactory } from '@nestjs/microservices';
import { RmqOptions } from '@nestjs/microservices/interfaces';
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
        queueOptions: {
          durable: true,
          deadLetterExchange: 'task.dlx',
          deadLetterRoutingKey: 'failed',
        },
      },
    } as RmqOptions);
  }

  getClient(): ClientProxy {
    return this.client;
  }

  async publishTask(
    taskType: string,
    taskId: string,
    options?: { delay?: number; metadata?: Record<string, any> },
  ): Promise<void> {
    const message: ITaskMessage = {
      taskType,
      taskId,
      delay: options?.delay,
      metadata: options?.metadata,
    };

    this.logger.log(`Publishing task message: ${JSON.stringify(message)}`);

    try {
      this.logger.log('Sending message...');
      await firstValueFrom(this.client.send('task.created', message));

      this.logger.log(
        `Task published successfully: ${taskType} - ${taskId}${
          options?.delay ? ` (delayed by ${options.delay}ms)` : ''
        }`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to publish task: ${taskType} - ${taskId}`,
        error.stack,
      );
      this.logger.error('Error details:', {
        message: error.message,
        name: error.name,
        code: error.code,
        fullError: error,
      });
      throw new Error(
        `Failed to publish task: ${error.message || 'Unknown error'}`,
      );
    }
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
      this.logger.log('Connected to RabbitMQ');
    } catch (error) {
      this.logger.error('Failed to connect to RabbitMQ', error.stack);
      throw new Error(`Failed to connect to RabbitMQ: ${error.message}`);
    }
  }

  async close(): Promise<void> {
    try {
      await this.client.close();
      this.logger.log('Disconnected from RabbitMQ');
    } catch (error) {
      this.logger.error('Failed to disconnect from RabbitMQ', error.stack);
    }
  }

  async onModuleDestroy() {
    await this.close();
  }
}
