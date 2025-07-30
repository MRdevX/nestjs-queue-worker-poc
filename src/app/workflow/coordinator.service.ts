import { Injectable, NotFoundException } from '@nestjs/common';
import { TaskService } from '../task/task.service';
import { MessagingService } from '../core/messaging/messaging.service';
import { WorkflowEntity } from './workflow.entity';

@Injectable()
export class CoordinatorService {
  constructor(
    private taskService: TaskService,
    private messagingService: MessagingService,
  ) {}

  async startWorkflow(workflow: WorkflowEntity) {
    const task = await this.taskService.createTask(
      workflow.definition.initialTask.type,
      workflow.definition.initialTask.payload,
      workflow.id,
    );
    await this.messagingService.publishTask(task.type, task.id);
  }

  async handleTaskCompletion(taskId: string) {
    const task = await this.taskService.getTaskByIdWithWorkflow(taskId);
    if (!task) {
      throw new NotFoundException(`Task with id ${taskId} not found`);
    }

    if (!task.workflow) {
      throw new NotFoundException(`Workflow not found for task ${taskId}`);
    }

    const transition = task.workflow.definition.transitions[task.type];

    if (transition) {
      const nextTask = await this.taskService.createTask(
        transition.type,
        transition.payload,
        task.workflow.id,
      );
      await this.messagingService.publishTask(nextTask.type, nextTask.id);
    }
  }
}
