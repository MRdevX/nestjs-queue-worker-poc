import { TaskType } from '../../task/types/task-type.enum';

export interface IWorkflowTransition {
  type: TaskType;
  payload: Record<string, any>;
}

export interface IWorkflowTransitionStrategy {
  canHandle(taskType: TaskType): boolean;
  getNextTransition(
    taskType: TaskType,
    workflowDefinition: any,
  ): IWorkflowTransition | null;
}
