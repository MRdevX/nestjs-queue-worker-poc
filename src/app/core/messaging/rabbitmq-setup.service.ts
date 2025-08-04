import * as amqp from 'amqplib';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RabbitMQSetupService implements OnModuleInit {
  private readonly logger = new Logger(RabbitMQSetupService.name);

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.setupRabbitMQ();
  }

  private async setupRabbitMQ() {
    try {
      this.logger.log('Setting up RabbitMQ exchanges and queues...');

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
      this.logger.log('RabbitMQ setup completed successfully');
    } catch (error) {
      this.logger.error('Failed to setup RabbitMQ:', error.stack);

      this.logger.warn(
        'Continuing without RabbitMQ setup - queues may not be properly configured',
      );
    }
  }
}
