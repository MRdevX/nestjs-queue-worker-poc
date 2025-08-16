import { registerAs } from '@nestjs/config';
import { Transport, RmqOptions, NatsOptions } from '@nestjs/microservices';

export default registerAs('s2s', (): RmqOptions | NatsOptions => {
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
});
