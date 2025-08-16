import { createClient } from 'redis';
import { Injectable } from '@nestjs/common';
import { BaseSetupService } from './base-setup.service';

@Injectable()
export class RedisSetupService extends BaseSetupService {
  protected async setup(): Promise<void> {
    try {
      this.logSetupStart();

      const s2sConfig = this.configService.get('s2s');
      const client = createClient({
        url: `redis://${s2sConfig.options.host}:${s2sConfig.options.port}`,
        password: s2sConfig.options.password,
        database: s2sConfig.options.db || 0,
      });

      await client.connect();

      const streams = [
        'task:http_request',
        'task:data_processing',
        'task:compensation',
        'task:fetch_orders',
        'task:create_invoice',
        'task:generate_pdf',
        'task:send_email',
        'task:general',
      ];

      for (const stream of streams) {
        try {
          await client.xAdd(stream, '*', {
            type: 'init',
            message: 'Stream initialized',
            timestamp: new Date().toISOString(),
          });
          this.logger.log(`Stream "${stream}" created`);
        } catch (error) {
          if (error.message.includes('BUSYGROUP')) {
            this.logger.log(`Stream "${stream}" already exists`);
          } else {
            this.logger.warn(
              `Failed to create stream "${stream}":`,
              error.message,
            );
          }
        }
      }

      await client.disconnect();
      this.logSetupSuccess();
    } catch (error) {
      this.logSetupError(error);
    }
  }

  protected getServiceName(): string {
    return 'Redis streams';
  }
}
