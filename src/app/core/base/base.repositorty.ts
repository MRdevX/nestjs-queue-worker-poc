import { Repository, FindManyOptions } from 'typeorm';
import { BaseModel } from './base.entity';

export abstract class BaseRepository<T extends BaseModel> {
  constructor(protected readonly repository: Repository<T>) {}

  async create(data: any): Promise<T> {
    const entity = this.repository.create(data);
    const savedEntity = await this.repository.save(entity);
    return Array.isArray(savedEntity) ? savedEntity[0] : savedEntity;
  }

  async findById(id: string): Promise<T | null> {
    return this.repository.findOne({ where: { id } as any });
  }

  async findByIdWithRelations(
    id: string,
    relations: string[] = [],
  ): Promise<T | null> {
    return this.repository.findOne({
      where: { id } as any,
      relations,
    });
  }

  async findAll(options?: FindManyOptions<T>): Promise<T[]> {
    return this.repository.find(options);
  }

  async findMany(where: any): Promise<T[]> {
    return this.repository.find({ where });
  }

  async update(id: string, data: any): Promise<T | null> {
    await this.repository.update(id, data);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.softDelete(id);
    return (result.affected || 0) > 0;
  }
}
