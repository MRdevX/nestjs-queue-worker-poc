import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DataWorker } from './data.worker';
import { HttpWorker } from './http.worker';
import { TaskModule } from '../task/task.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [
    TaskModule,
    WorkflowModule,
    ClientsModule.registerAsync([
      {
        name: 'WORKER_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: configService.get('s2s.options.urls'),
            queue: configService.get('s2s.options.queue'),
            queueOptions: {
              durable: false,
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  providers: [DataWorker, HttpWorker],
  exports: [DataWorker, HttpWorker],
})
export class WorkerModule {}
