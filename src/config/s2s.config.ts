import { registerAs } from '@nestjs/config';
import { Transport } from '@nestjs/microservices';

export default registerAs('s2s', () => {
  const host = process.env.RABBITMQ_HOST || 'localhost';
  const port = process.env.RABBITMQ_PORT || '5672';
  const user = process.env.RABBITMQ_USER || 'guest';
  const password = process.env.RABBITMQ_PASSWORD || 'guest';
  const queue = process.env.RABBITMQ_QUEUE_NAME || 'default_queue';

  return {
    transport: Transport.RMQ,
    options: {
      urls: [`amqp://${user}:${password}@${host}:${port}`],
      queue,
    },
  };
});
