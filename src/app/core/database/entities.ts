import { TaskExecutionLog } from '@root/app/task/task-execution-log.entity';
import { TaskEntity } from '@root/app/task/task.entity';
import { WorkflowEntity } from '@root/app/workflow/workflow.entity';

export const entities = [TaskEntity, TaskExecutionLog, WorkflowEntity];
