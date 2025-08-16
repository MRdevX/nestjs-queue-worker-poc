import { Injectable } from '@nestjs/common';
import { ClientProxy, ClientProxyFactory } from '@nestjs/microservices';
import { Transport } from '@nestjs/microservices/enums';
import { NatsOptions } from '@nestjs/microservices/interfaces';
import { BaseProvider } from './base.provider';

@Injectable()
export class NatsProvider extends BaseProvider {
  protected createClient(): ClientProxy {
    return ClientProxyFactory.create({
      transport: Transport.NATS,
      options: {
        servers: this.config.options.servers || this.config.options.urls,
        queue: this.config.options.queue,
        ...this.config.options,
      },
    } as NatsOptions);
  }

  protected getTransportName(): string {
    return 'NATS';
  }
}
