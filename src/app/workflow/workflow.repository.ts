import { Repository } from 'typeorm';
import { BaseRepository } from '../core/base/base.repositorty';
import { WorkflowEntity } from './workflow.entity';

export class WorkflowRepository extends BaseRepository<WorkflowEntity> {
  constructor(repository: Repository<WorkflowEntity>) {
    super(repository);
  }

  async findActiveWorkflows(): Promise<WorkflowEntity[]> {
    return this.repository.find({
      where: { isActive: true },
      relations: ['tasks'],
    });
  }

  async findWithTasks(id: string): Promise<WorkflowEntity> {
    const workflow = await this.repository.findOne({
      where: { id },
      relations: ['tasks', 'tasks.children'],
    });
    if (!workflow) {
      throw new Error(`Workflow with id ${id} not found.`);
    }
    return workflow;
  }
}
