import { Entity, Column, ManyToOne, Index } from 'typeorm';
import { TaskEntity } from './task.entity';
import { BaseModel } from '../core/base/base.entity';
import { LogLevel } from './types/log-level.enum';

@Entity()
export class TaskLogEntity extends BaseModel {
  @Column({ type: 'enum', enum: LogLevel })
  level: LogLevel;

  @Column()
  message: string;

  @Column('jsonb', { nullable: true })
  context: Record<string, any>;

  @ManyToOne(() => TaskEntity, (task) => task.logs, {
    onDelete: 'CASCADE',
  })
  task: TaskEntity;

  @Index()
  @Column({ type: 'timestamp' })
  timestamp: Date;
}
