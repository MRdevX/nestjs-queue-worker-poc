import { Injectable, Logger } from '@nestjs/common';
import { WorkflowCoordinationService } from './workflow-coordination.service';
import { WorkflowExecutionService } from './workflow-execution.service';

@Injectable()
export class CoordinatorService {
  private readonly logger = new Logger(CoordinatorService.name);

  constructor(
    private readonly workflowExecutionService: WorkflowExecutionService,
    private readonly workflowCoordinationService: WorkflowCoordinationService,
  ) {}

  async startWorkflow(workflow: any): Promise<void> {
    await this.workflowExecutionService.startWorkflow(workflow);
  }

  async handleTaskCompletion(taskId: string): Promise<void> {
    await this.workflowCoordinationService.handleTaskCompletion(taskId);
  }

  async handleTaskFailure(taskId: string, error: Error): Promise<void> {
    await this.workflowCoordinationService.handleTaskFailure(taskId, error);
  }
}
