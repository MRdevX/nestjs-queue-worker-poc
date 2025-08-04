import { registerAs } from '@nestjs/config';
import { Transport, RmqOptions } from '@nestjs/microservices';

export default registerAs('s2s', (): RmqOptions => {
  const host = process.env.RABBITMQ_HOST || 'localhost';
  const port = process.env.RABBITMQ_PORT || '5672';
  const user = process.env.RABBITMQ_USER || 'guest';
  const password = process.env.RABBITMQ_PASSWORD || 'guest';

  return {
    transport: Transport.RMQ,
    options: {
      urls: [`amqp://${user}:${password}@${host}:${port}`],
    },
  };
});
