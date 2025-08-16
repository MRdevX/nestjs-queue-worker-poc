import { Injectable } from '@nestjs/common';
import { TaskType } from '../../task/types/task-type.enum';
import {
  IWorkflowTransitionStrategy,
  IWorkflowTransition,
} from './workflow-transition.strategy';

@Injectable()
export class DefaultTransitionStrategy implements IWorkflowTransitionStrategy {
  canHandle(taskType: TaskType): boolean {
    return true;
  }

  getNextTransition(
    taskType: TaskType,
    workflowDefinition: any,
  ): IWorkflowTransition | null {
    const transition = workflowDefinition.transitions?.[taskType];

    if (!transition) {
      return null;
    }

    return {
      type: transition.type,
      payload: transition.payload || {},
    };
  }
}
