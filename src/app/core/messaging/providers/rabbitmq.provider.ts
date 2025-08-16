import { Injectable } from '@nestjs/common';
import { ClientProxy, ClientProxyFactory } from '@nestjs/microservices';
import { Transport } from '@nestjs/microservices/enums';
import { RmqOptions } from '@nestjs/microservices/interfaces';
import { BaseProvider } from './base.provider';

@Injectable()
export class RabbitMQProvider extends BaseProvider {
  protected createClient(): ClientProxy {
    return ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: this.config.options.urls,
        queue: this.config.options.queue,
        queueOptions: this.config.options.queueOptions,
      },
    } as RmqOptions);
  }

  protected getTransportName(): string {
    return 'RabbitMQ';
  }
}
