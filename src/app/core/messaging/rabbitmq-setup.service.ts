import * as amqp from 'amqplib';
import { Injectable } from '@nestjs/common';
import { BaseSetupService } from './base-setup.service';

@Injectable()
export class RabbitMQSetupService extends BaseSetupService {
  protected async setup(): Promise<void> {
    try {
      this.logSetupStart();

      const s2sConfig = this.configService.get('s2s');
      const connection = await amqp.connect(s2sConfig.options.urls[0]);
      const channel = await connection.createChannel();

      await channel.assertExchange('dlx', 'direct', { durable: true });
      await channel.assertQueue('failed_tasks_queue', { durable: true });
      await channel.bindQueue('failed_tasks_queue', 'dlx', 'failed');
      this.logger.log('Dead letter exchange and queue configured');

      const taskQueues = [
        'http_request_queue',
        'data_processing_queue',
        'compensation_queue',
        'fetch_orders_queue',
        'create_invoice_queue',
        'generate_pdf_queue',
        'send_email_queue',
      ];

      for (const queueName of taskQueues) {
        await channel.assertQueue(queueName, {
          durable: true,
          deadLetterExchange: 'dlx',
          deadLetterRoutingKey: 'failed',
        });
        this.logger.log(`Queue "${queueName}" declared`);
      }

      await channel.close();
      await connection.close();
      this.logSetupSuccess();
    } catch (error) {
      this.logSetupError(error);
    }
  }

  protected getServiceName(): string {
    return 'RabbitMQ exchanges and queues';
  }
}
