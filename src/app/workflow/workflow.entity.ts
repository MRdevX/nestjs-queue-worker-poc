import { Entity, Column, OneToMany } from 'typeorm';
import { BaseModel } from '../core/base/base.entity';
import { TaskType } from '../task/types/task-type.enum';
import { TaskEntity } from '../task/task.entity';

@Entity()
export class WorkflowEntity extends BaseModel {
  @Column()
  name: string;

  @Column('jsonb')
  definition: {
    initialTask: {
      type: TaskType;
      payload: Record<string, any>;
    };
    transitions: Record<
      string,
      {
        type: TaskType;
        payload: Record<string, any>;
      }
    >;
  };

  @OneToMany(() => TaskEntity, (task) => task.workflow)
  tasks: TaskEntity[];

  @Column({ default: true })
  isActive: boolean;
}
