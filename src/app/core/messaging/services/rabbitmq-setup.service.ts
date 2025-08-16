import * as amqp from 'amqplib';
import { Injectable } from '@nestjs/common';
import {
  EXCHANGE_NAMES,
  QUEUE_NAMES,
  ROUTING_KEYS,
} from '../constants/queue-names.constants';
import { BaseSetupService } from './base-setup.service';

@Injectable()
export class RabbitMQSetupService extends BaseSetupService {
  public async setup(): Promise<void> {
    try {
      this.logSetupStart();

      const s2sConfig = this.configService.get('s2s');
      const connection = await amqp.connect(s2sConfig.options.urls[0]);
      const channel = await connection.createChannel();

      await this.setupDeadLetterExchange(channel);

      await this.setupTaskQueues(channel);

      await channel.close();
      await connection.close();
      this.logSetupSuccess();
    } catch (error) {
      this.logSetupError(error);
    }
  }

  private async setupDeadLetterExchange(channel: amqp.Channel): Promise<void> {
    await channel.assertExchange(EXCHANGE_NAMES.DEAD_LETTER, 'direct', {
      durable: true,
    });
    await channel.assertQueue(QUEUE_NAMES.FAILED_TASKS, { durable: true });
    await channel.bindQueue(
      QUEUE_NAMES.FAILED_TASKS,
      EXCHANGE_NAMES.DEAD_LETTER,
      ROUTING_KEYS.FAILED,
    );
    this.logger.log('Dead letter exchange and queue configured');
  }

  private async setupTaskQueues(channel: amqp.Channel): Promise<void> {
    const taskQueues = Object.values(QUEUE_NAMES).filter(
      (name) => name !== QUEUE_NAMES.FAILED_TASKS,
    );

    for (const queueName of taskQueues) {
      await channel.assertQueue(queueName, {
        durable: true,
        deadLetterExchange: EXCHANGE_NAMES.DEAD_LETTER,
        deadLetterRoutingKey: ROUTING_KEYS.FAILED,
      });
      this.logger.log(`Queue "${queueName}" declared`);
    }
  }

  public getServiceName(): string {
    return 'RabbitMQ exchanges and queues';
  }
}
