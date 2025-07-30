import { Repository } from 'typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BaseEntityMockFactory } from '@test/mocks';
import { TaskLogRepository } from '../task-log.repository';
import { TaskLogEntity } from '../task-log.entity';
import { LogLevel } from '../types/log-level.enum';

describe('TaskLogRepository', () => {
  let repository: TaskLogRepository;
  let typeOrmRepository: jest.Mocked<Repository<TaskLogEntity>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskLogRepository,
        {
          provide: getRepositoryToken(TaskLogEntity),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
          },
        },
      ],
    }).compile();

    repository = module.get<TaskLogRepository>(TaskLogRepository);
    typeOrmRepository = module.get(getRepositoryToken(TaskLogEntity));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createLogEntry', () => {
    it('should create a log entry successfully', async () => {
      const taskId = 'task-123';
      const level = LogLevel.INFO;
      const message = 'Task created successfully';
      const mockLogEntry = {
        ...BaseEntityMockFactory.create(),
        task: { id: taskId },
        level,
        message,
        timestamp: expect.any(Date),
      };

      typeOrmRepository.create.mockReturnValue(mockLogEntry as TaskLogEntity);
      typeOrmRepository.save.mockResolvedValue(mockLogEntry as TaskLogEntity);

      const result = await repository.createLogEntry(taskId, level, message);

      expect(typeOrmRepository.create).toHaveBeenCalledWith({
        task: { id: taskId },
        level,
        message,
        timestamp: expect.any(Date),
      });
      expect(typeOrmRepository.save).toHaveBeenCalledWith(mockLogEntry);
      expect(result).toEqual(mockLogEntry);
    });

    it('should create error log entry', async () => {
      const taskId = 'task-123';
      const level = LogLevel.ERROR;
      const message = 'Task failed with error';

      const mockLogEntry = {
        ...BaseEntityMockFactory.create(),
        task: { id: taskId },
        level,
        message,
        timestamp: expect.any(Date),
      };

      typeOrmRepository.create.mockReturnValue(mockLogEntry as TaskLogEntity);
      typeOrmRepository.save.mockResolvedValue(mockLogEntry as TaskLogEntity);

      const result = await repository.createLogEntry(taskId, level, message);

      expect(typeOrmRepository.create).toHaveBeenCalledWith({
        task: { id: taskId },
        level,
        message,
        timestamp: expect.any(Date),
      });
      expect(result).toEqual(mockLogEntry);
    });

    it('should create warning log entry', async () => {
      const taskId = 'task-123';
      const level = LogLevel.WARNING;
      const message = 'Task taking longer than expected';

      const mockLogEntry = {
        ...BaseEntityMockFactory.create(),
        task: { id: taskId },
        level,
        message,
        timestamp: expect.any(Date),
      };

      typeOrmRepository.create.mockReturnValue(mockLogEntry as TaskLogEntity);
      typeOrmRepository.save.mockResolvedValue(mockLogEntry as TaskLogEntity);

      const result = await repository.createLogEntry(taskId, level, message);

      expect(typeOrmRepository.create).toHaveBeenCalledWith({
        task: { id: taskId },
        level,
        message,
        timestamp: expect.any(Date),
      });
      expect(result).toEqual(mockLogEntry);
    });

    it('should set timestamp to current date', async () => {
      const taskId = 'task-123';
      const level = LogLevel.INFO;
      const message = 'Test message';
      const beforeCall = new Date();

      const mockLogEntry = {
        ...BaseEntityMockFactory.create(),
        task: { id: taskId },
        level,
        message,
        timestamp: new Date(),
      };

      typeOrmRepository.create.mockReturnValue(mockLogEntry as TaskLogEntity);
      typeOrmRepository.save.mockResolvedValue(mockLogEntry as TaskLogEntity);

      await repository.createLogEntry(taskId, level, message);

      const afterCall = new Date();
      const createCall = typeOrmRepository.create.mock.calls[0][0];

      expect(createCall.timestamp).toBeInstanceOf(Date);

      expect(createCall.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('inherited methods', () => {
    it('should use base repository create method', async () => {
      const logData = {
        task: { id: 'task-123' },
        level: LogLevel.INFO,
        message: 'Test log',
        timestamp: new Date(),
      };
      const mockLogEntry = {
        ...BaseEntityMockFactory.create(),
        ...logData,
      };

      typeOrmRepository.create.mockReturnValue(mockLogEntry as TaskLogEntity);
      typeOrmRepository.save.mockResolvedValue(mockLogEntry as TaskLogEntity);

      const result = await repository.create(logData);

      expect(typeOrmRepository.create).toHaveBeenCalledWith(logData);
      expect(typeOrmRepository.save).toHaveBeenCalledWith(mockLogEntry);
      expect(result).toEqual(mockLogEntry);
    });

    it('should use base repository findById method', async () => {
      const logId = 'log-123';
      const mockLogEntry = {
        ...BaseEntityMockFactory.create({ id: logId }),
      };

      typeOrmRepository.findOne.mockResolvedValue(
        mockLogEntry as TaskLogEntity,
      );

      const result = await repository.findById(logId);

      expect(typeOrmRepository.findOne).toHaveBeenCalledWith({
        where: { id: logId },
      });
      expect(result).toEqual(mockLogEntry);
    });

    it('should use base repository findMany method', async () => {
      const where = { level: LogLevel.ERROR };
      const mockLogEntries = [
        {
          ...BaseEntityMockFactory.create(),
          level: LogLevel.ERROR,
        },
        {
          ...BaseEntityMockFactory.create(),
          level: LogLevel.ERROR,
        },
      ];

      typeOrmRepository.find.mockResolvedValue(
        mockLogEntries as TaskLogEntity[],
      );

      const result = await repository.findMany(where);

      expect(typeOrmRepository.find).toHaveBeenCalledWith({ where });
      expect(result).toEqual(mockLogEntries);
    });

    it('should use base repository update method', async () => {
      const logId = 'log-123';
      const updateData = { message: 'Updated message' };

      typeOrmRepository.update.mockResolvedValue({ affected: 1 } as any);

      await repository.update(logId, updateData);

      expect(typeOrmRepository.update).toHaveBeenCalledWith(logId, updateData);
    });

    it('should use base repository findByIdWithRelations method', async () => {
      const logId = 'log-123';
      const relations = ['task'];
      const mockLogEntry = {
        ...BaseEntityMockFactory.create({ id: logId }),
      };

      typeOrmRepository.findOne.mockResolvedValue(
        mockLogEntry as TaskLogEntity,
      );

      const result = await repository.findByIdWithRelations(logId, relations);

      expect(typeOrmRepository.findOne).toHaveBeenCalledWith({
        where: { id: logId },
        relations,
      });
      expect(result).toEqual(mockLogEntry);
    });
  });
});
