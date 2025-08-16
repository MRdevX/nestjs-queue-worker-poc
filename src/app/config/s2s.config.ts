import { registerAs } from '@nestjs/config';
import {
  Transport,
  RmqOptions,
  NatsOptions,
  RedisOptions,
} from '@nestjs/microservices';

export default registerAs(
  's2s',
  (): RmqOptions | NatsOptions | RedisOptions => {
    const transport = process.env.MESSAGING_TRANSPORT || 'rmq';

    if (transport === 'nats') {
      const servers = process.env.NATS_SERVERS?.split(',') || [
        'nats://localhost:4222',
      ];

      return {
        transport: Transport.NATS,
        options: {
          servers,
          queue: process.env.NATS_QUEUE || 'task-queue',
        },
      } as NatsOptions;
    }

    if (transport === 'redis') {
      const host = process.env.REDIS_HOST || 'localhost';
      const port = parseInt(process.env.REDIS_PORT || '6379', 10);
      const password = process.env.REDIS_PASSWORD;
      const db = parseInt(process.env.REDIS_DB || '0', 10);

      return {
        transport: Transport.REDIS,
        options: {
          host,
          port,
          password,
          db,
        },
      } as RedisOptions;
    }

    const host = process.env.RABBITMQ_HOST || 'localhost';
    const port = process.env.RABBITMQ_PORT || '5672';
    const user = process.env.RABBITMQ_USER || 'guest';
    const password = process.env.RABBITMQ_PASSWORD || 'guest';

    return {
      transport: Transport.RMQ,
      options: {
        urls: [`amqp://${user}:${password}@${host}:${port}`],
        queue: process.env.RABBITMQ_QUEUE || 'task-queue',
        queueOptions: {
          durable: true,
          deadLetterExchange: 'dlx',
          deadLetterRoutingKey: 'failed',
        },
      },
    } as RmqOptions;
  },
);
