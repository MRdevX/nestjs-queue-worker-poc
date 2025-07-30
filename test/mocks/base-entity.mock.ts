import { faker } from '@faker-js/faker';
import { BaseModel } from '@root/app/core/base/base.entity';

export interface IBaseEntityMockData {
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export class BaseEntityMockFactory {
  static create(data: IBaseEntityMockData = {}): Partial<BaseModel> {
    return {
      id: data.id || faker.string.uuid(),
      createdAt: data.createdAt || faker.date.past(),
      updatedAt: data.updatedAt || faker.date.recent(),
      deletedAt: data.deletedAt || undefined,
    };
  }

  static createArray(
    count: number = 3,
    data: IBaseEntityMockData = {},
  ): Partial<BaseModel>[] {
    return Array.from({ length: count }, () => this.create(data));
  }

  static createSoftDeleted(data: IBaseEntityMockData = {}): Partial<BaseModel> {
    const createdAt = data.createdAt || faker.date.past();
    const updatedAt = data.updatedAt || faker.date.recent();

    return {
      id: data.id || faker.string.uuid(),
      createdAt,
      updatedAt,
      deletedAt:
        data.deletedAt ||
        faker.date.between({ from: updatedAt, to: new Date() }),
    };
  }
}
