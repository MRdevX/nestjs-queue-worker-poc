import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy, ClientProxyFactory } from '@nestjs/microservices';
import { RmqOptions } from '@nestjs/microservices/interfaces';

@Injectable()
export class MessagingService {
  private client: ClientProxy;

  constructor(private configService: ConfigService) {
    const s2sConfig = this.configService.get('s2s');
    this.client = ClientProxyFactory.create({
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
    await this.client.emit('task.created', { taskType, taskId }).toPromise();
  }
}
