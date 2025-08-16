import { Injectable } from '@nestjs/common';
import { ClientProxy, ClientProxyFactory } from '@nestjs/microservices';
import { Transport } from '@nestjs/microservices/enums';
import { RedisOptions } from '@nestjs/microservices/interfaces';
import { BaseProvider } from './base.provider';

@Injectable()
export class RedisProvider extends BaseProvider {
  protected createClient(): ClientProxy {
    return ClientProxyFactory.create({
      transport: Transport.REDIS,
      options: {
        host: this.config.options.host,
        port: this.config.options.port,
        password: this.config.options.password,
        db: this.config.options.db,
        ...this.config.options,
      },
    } as RedisOptions);
  }

  protected getTransportName(): string {
    return 'Redis';
  }
}
