import { Injectable } from '@nestjs/common';
import { BaseWorker } from './base.worker';
import { TaskService } from '../task/task.service';
import { CoordinatorService } from '../workflow/coordinator.service';
import { MessagingService } from '../core/messaging/messaging.service';
import { UtilsService } from '../core/utils/utils.service';

@Injectable()
export class DataWorker extends BaseWorker {
  constructor(
    taskService: TaskService,
    coordinator: CoordinatorService,
    messagingService: MessagingService,
  ) {
    super(taskService, coordinator, messagingService);
  }

  protected async processTask(taskId: string) {
    await this.taskService.getTaskById(taskId);
    await UtilsService.sleep(500);
    if (Math.random() > 0.8) throw new Error('Random processing failure');
  }
}
