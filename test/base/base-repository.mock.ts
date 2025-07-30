export class MockBaseRepository {
  public readonly create = jest.fn();
  public readonly save = jest.fn();
  public readonly findOne = jest.fn();
  public readonly find = jest.fn();
  public readonly update = jest.fn();
  public readonly softDelete = jest.fn();
  public readonly delete = jest.fn();
  public readonly count = jest.fn();

  get repository() {
    return {
      create: this.create,
      save: this.save,
      findOne: this.findOne,
      find: this.find,
      update: this.update,
      softDelete: this.softDelete,
      delete: this.delete,
      count: this.count,
    } as any;
  }

  reset(): void {
    jest.clearAllMocks();
  }
}

export class BaseRepositoryMockFactory {
  static create(): MockBaseRepository {
    return new MockBaseRepository();
  }

  static createWithDefaults(): MockBaseRepository {
    const mock = new MockBaseRepository();

    mock.create.mockImplementation((data) => data);
    mock.save.mockImplementation((entity) => entity);
    mock.findOne.mockResolvedValue(null);
    mock.find.mockResolvedValue([]);
    mock.update.mockResolvedValue({ affected: 1 });
    mock.softDelete.mockResolvedValue({ affected: 1 });
    mock.delete.mockResolvedValue({ affected: 1 });
    mock.count.mockResolvedValue(0);

    return mock;
  }
}
