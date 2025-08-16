import { connect, RetentionPolicy, DiscardPolicy } from 'nats';
import { Injectable } from '@nestjs/common';
import { BaseSetupService } from './base-setup.service';

@Injectable()
export class NatsSetupService extends BaseSetupService {
  protected async setup(): Promise<void> {
    try {
      this.logSetupStart();

      const s2sConfig = this.configService.get('s2s');
      const nc = await connect({
        servers: s2sConfig.options.servers || s2sConfig.options.urls,
      });

      const streams = [
        { name: 'TASKS', subjects: ['task.*'] },
        { name: 'HTTP_TASKS', subjects: ['http.request'] },
        { name: 'DATA_TASKS', subjects: ['data.processing'] },
        { name: 'COMPENSATION_TASKS', subjects: ['compensation'] },
        { name: 'FETCH_ORDERS_TASKS', subjects: ['fetch.orders'] },
        { name: 'INVOICE_TASKS', subjects: ['create.invoice'] },
        { name: 'PDF_TASKS', subjects: ['generate.pdf'] },
        { name: 'EMAIL_TASKS', subjects: ['send.email'] },
      ];

      const jsm = await nc.jetstreamManager();

      for (const stream of streams) {
        try {
          await jsm.streams.add({
            name: stream.name,
            subjects: stream.subjects,
            retention: RetentionPolicy.Workqueue,
            max_msgs_per_subject: 1000,
            discard: DiscardPolicy.Old,
          });
          this.logger.log(`Stream "${stream.name}" created`);
        } catch (error) {
          if (error.code === 400) {
            this.logger.log(`Stream "${stream.name}" already exists`);
          } else {
            this.logger.warn(
              `Failed to create stream "${stream.name}":`,
              error.message,
            );
          }
        }
      }

      await nc.close();
      this.logSetupSuccess();
    } catch (error) {
      this.logSetupError(error);
    }
  }

  protected getServiceName(): string {
    return 'NATS streams and subjects';
  }
}
