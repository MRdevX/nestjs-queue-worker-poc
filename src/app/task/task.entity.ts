import { Column, Entity, Index, ManyToOne, OneToMany } from 'typeorm';
import { BaseModel } from '../core/base/base.entity';
import { TaskType } from './types/task-type.enum';
import { TaskStatus } from './types/task-status.enum';
import { WorkflowEntity } from '../workflow/workflow.entity';
import { TaskExecutionLog } from './task-log.entity';

@Entity()
export class TaskEntity extends BaseModel {
  @Column({ type: 'enum', enum: TaskType })
  type: TaskType;

  @Column('jsonb')
  payload: Record<string, any>;

  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.PENDING })
  status: TaskStatus;

  @Column({ default: 0 })
  retries: number;

  @Column({ default: 3 })
  maxRetries: number;

  @Column({ nullable: true })
  error: string;

  @ManyToOne(() => WorkflowEntity, (workflow) => workflow.tasks, {
    onDelete: 'CASCADE',
  })
  workflow: WorkflowEntity;

  @ManyToOne(() => TaskEntity, (task) => task.children, { nullable: true })
  parentTask: TaskEntity;

  @OneToMany(() => TaskEntity, (task) => task.parentTask)
  children: TaskEntity[];

  @OneToMany(() => TaskExecutionLog, (log) => log.task)
  logs: TaskExecutionLog[];

  @Index()
  @Column({ type: 'timestamp', nullable: true })
  scheduledAt: Date;
}
