import { Injectable, Logger } from '@nestjs/common';
import { TaskType } from '../task/types/task-type.enum';
import { CoordinatorService } from './coordinator.service';
import { InvoiceCoordinatorService } from '../invoice/invoice-coordinator.service';

@Injectable()
export class CoordinatorFactoryService {
  private readonly logger = new Logger(CoordinatorFactoryService.name);

  constructor(
    private readonly coordinator: CoordinatorService,
    private readonly invoiceCoordinator: InvoiceCoordinatorService,
  ) {}

  getCoordinator(taskType: TaskType) {
    const invoiceTaskTypes = [
      TaskType.FETCH_ORDERS,
      TaskType.CREATE_INVOICE,
      TaskType.GENERATE_PDF,
      TaskType.SEND_EMAIL,
    ];

    if (invoiceTaskTypes.includes(taskType)) {
      this.logger.debug(`Using InvoiceCoordinator for task type: ${taskType}`);
      return this.invoiceCoordinator;
    }

    this.logger.debug(`Using generic Coordinator for task type: ${taskType}`);
    return this.coordinator;
  }
}
