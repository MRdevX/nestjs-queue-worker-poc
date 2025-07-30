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
    const task = await this.taskService.getTaskById(taskId);
    if (!task) {
      throw new Error(`Task with id ${taskId} not found`);
    }

    await UtilsService.sleep(500);

    if (task.payload?.forceFailure === true) {
      throw new Error('Forced failure for testing purposes');
    }

    if (Math.random() > 0.8) {
      throw new Error('Random processing failure');
    }
  }
}
