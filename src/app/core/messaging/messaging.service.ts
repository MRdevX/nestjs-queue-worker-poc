import { firstValueFrom } from 'rxjs';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy, ClientProxyFactory } from '@nestjs/microservices';
import { RmqOptions } from '@nestjs/microservices/interfaces';
import { ITaskMessage } from './types/task-message.interface';

@Injectable()
export class MessagingService {
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
          durable: false,
        },
      },
    } as RmqOptions);
  }

  getClient(): ClientProxy {
    return this.client;
  }

  async publishTask(taskType: string, taskId: string): Promise<void> {
    const message: ITaskMessage = { taskType, taskId };

    try {
      await firstValueFrom(this.client.emit('task.created', message));

      this.logger.log(`Task published successfully: ${taskType} - ${taskId}`);
    } catch (error) {
      this.logger.error(
        `Failed to publish task: ${taskType} - ${taskId}`,
        error.stack,
      );
      throw new Error(`Failed to publish task: ${error.message}`);
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
}
