import { Injectable, Logger } from '@nestjs/common';
import { TaskService } from '../../task/task.service';
import { TaskQueueService } from '../../queue/task-queue.service';
import { WorkflowEntity, WorkflowStatus } from '../workflow.entity';
import { WorkflowService } from './workflow.service';

@Injectable()
export class WorkflowExecutionService {
  private readonly logger = new Logger(WorkflowExecutionService.name);

  constructor(
    private readonly taskService: TaskService,
    private readonly taskQueueService: TaskQueueService,
    private readonly workflowService: WorkflowService,
  ) {}

  async startWorkflow(workflow: WorkflowEntity): Promise<void> {
    try {
      await this.workflowService.updateWorkflowStatus(
        workflow.id,
        WorkflowStatus.RUNNING,
      );

      const initialTask = await this.createInitialTask(workflow);
      await this.queueInitialTask(initialTask, workflow.id);

      this.logger.log(
        `Workflow ${workflow.id} started with initial task ${initialTask.id}`,
      );
    } catch (error) {
      await this.handleWorkflowStartError(workflow.id, error);
      throw error;
    }
  }

  private async createInitialTask(workflow: WorkflowEntity) {
    return this.taskService.createTask(
      workflow.definition.initialTask.type,
      workflow.definition.initialTask.payload,
      workflow.id,
    );
  }

  private async queueInitialTask(task: any, workflowId: string): Promise<void> {
    await this.taskQueueService.enqueueTask(
      task.type,
      task.payload,
      workflowId,
    );
  }

  private async handleWorkflowStartError(
    workflowId: string,
    error: any,
  ): Promise<void> {
    await this.workflowService.updateWorkflowStatus(
      workflowId,
      WorkflowStatus.FAILED,
      error.message,
    );
    this.logger.error(`Failed to start workflow ${workflowId}`, error.stack);
  }
}
