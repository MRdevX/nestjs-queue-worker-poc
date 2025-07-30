import { Repository } from 'typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TaskEntityMockFactory } from '@test/mocks';
import { TaskRepository } from '../task.repository';
import { TaskEntity } from '../task.entity';
import { TaskStatus } from '../types/task-status.enum';
import { TaskType } from '../types/task-type.enum';

describe('TaskRepository', () => {
  let repository: TaskRepository;
  let typeOrmRepository: jest.Mocked<Repository<TaskEntity>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskRepository,
        {
          provide: getRepositoryToken(TaskEntity),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            increment: jest.fn(),
          },
        },
      ],
    }).compile();

    repository = module.get<TaskRepository>(TaskRepository);
    typeOrmRepository = module.get(getRepositoryToken(TaskEntity));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findPendingTasks', () => {
    it('should find pending tasks with default limit', async () => {
      const mockTasks = TaskEntityMockFactory.createArray(3, {
        status: TaskStatus.PENDING,
      });

      typeOrmRepository.find.mockResolvedValue(mockTasks as TaskEntity[]);

      const result = await repository.findPendingTasks();

      expect(typeOrmRepository.find).toHaveBeenCalledWith({
        where: { status: TaskStatus.PENDING },
        order: { createdAt: 'ASC' },
        take: 100,
      });
      expect(result).toEqual(mockTasks);
    });

    it('should find pending tasks with custom limit', async () => {
      const limit = 50;
      const mockTasks = TaskEntityMockFactory.createArray(2, {
        status: TaskStatus.PENDING,
      });

      typeOrmRepository.find.mockResolvedValue(mockTasks as TaskEntity[]);

      const result = await repository.findPendingTasks(limit);

      expect(typeOrmRepository.find).toHaveBeenCalledWith({
        where: { status: TaskStatus.PENDING },
        order: { createdAt: 'ASC' },
        take: limit,
      });
      expect(result).toEqual(mockTasks);
    });

    it('should return empty array when no pending tasks found', async () => {
      typeOrmRepository.find.mockResolvedValue([]);

      const result = await repository.findPendingTasks();

      expect(result).toEqual([]);
    });
  });

  describe('updateTaskStatus', () => {
    it('should update task status without error', async () => {
      const taskId = 'task-123';
      const newStatus = TaskStatus.COMPLETED;

      typeOrmRepository.update.mockResolvedValue({ affected: 1 } as any);

      await repository.updateTaskStatus(taskId, newStatus);

      expect(typeOrmRepository.update).toHaveBeenCalledWith(taskId, {
        status: newStatus,
      });
    });

    it('should update task status with error', async () => {
      const taskId = 'task-123';
      const newStatus = TaskStatus.FAILED;
      const error = 'Something went wrong';

      typeOrmRepository.update.mockResolvedValue({ affected: 1 } as any);

      await repository.updateTaskStatus(taskId, newStatus, error);

      expect(typeOrmRepository.update).toHaveBeenCalledWith(taskId, {
        status: newStatus,
        error,
      });
    });

    it('should handle update with no affected rows', async () => {
      const taskId = 'task-123';
      const newStatus = TaskStatus.COMPLETED;

      typeOrmRepository.update.mockResolvedValue({ affected: 0 } as any);

      await repository.updateTaskStatus(taskId, newStatus);

      expect(typeOrmRepository.update).toHaveBeenCalledWith(taskId, {
        status: newStatus,
      });
    });
  });

  describe('incrementRetryCount', () => {
    it('should increment retry count successfully', async () => {
      const taskId = 'task-123';

      typeOrmRepository.increment.mockResolvedValue({ affected: 1 } as any);

      await repository.incrementRetryCount(taskId);

      expect(typeOrmRepository.increment).toHaveBeenCalledWith(
        { id: taskId },
        'retries',
        1,
      );
    });

    it('should handle increment with no affected rows', async () => {
      const taskId = 'task-123';

      typeOrmRepository.increment.mockResolvedValue({ affected: 0 } as any);

      await repository.incrementRetryCount(taskId);

      expect(typeOrmRepository.increment).toHaveBeenCalledWith(
        { id: taskId },
        'retries',
        1,
      );
    });
  });

  describe('findScheduledTasks', () => {
    it('should find scheduled tasks', async () => {
      const mockTasks = TaskEntityMockFactory.createArray(2, {
        status: TaskStatus.PENDING,
        scheduledAt: new Date(),
      });

      typeOrmRepository.find.mockResolvedValue(mockTasks as TaskEntity[]);

      const result = await repository.findScheduledTasks();

      expect(typeOrmRepository.find).toHaveBeenCalledWith({
        where: {
          status: TaskStatus.PENDING,
          scheduledAt: expect.any(Object),
        },
        order: { scheduledAt: 'ASC' },
      });
      expect(result).toEqual(mockTasks);
    });

    it('should return empty array when no scheduled tasks found', async () => {
      typeOrmRepository.find.mockResolvedValue([]);

      const result = await repository.findScheduledTasks();

      expect(result).toEqual([]);
    });
  });

  describe('inherited methods', () => {
    it('should use base repository create method', async () => {
      const taskData = {
        type: TaskType.HTTP_REQUEST,
        payload: { url: 'https://api.example.com' },
        status: TaskStatus.PENDING,
      };
      const mockTask = TaskEntityMockFactory.create(taskData);

      typeOrmRepository.create.mockReturnValue(mockTask as TaskEntity);
      typeOrmRepository.save.mockResolvedValue(mockTask as TaskEntity);

      const result = await repository.create(taskData);

      expect(typeOrmRepository.create).toHaveBeenCalledWith(taskData);
      expect(typeOrmRepository.save).toHaveBeenCalledWith(mockTask);
      expect(result).toEqual(mockTask);
    });

    it('should use base repository findById method', async () => {
      const taskId = 'task-123';
      const mockTask = TaskEntityMockFactory.create({ id: taskId });

      typeOrmRepository.findOne.mockResolvedValue(mockTask as TaskEntity);

      const result = await repository.findById(taskId);

      expect(typeOrmRepository.findOne).toHaveBeenCalledWith({
        where: { id: taskId },
      });
      expect(result).toEqual(mockTask);
    });

    it('should use base repository findMany method', async () => {
      const where = { status: TaskStatus.FAILED };
      const mockTasks = TaskEntityMockFactory.createArray(2, {
        status: TaskStatus.FAILED,
      });

      typeOrmRepository.find.mockResolvedValue(mockTasks as TaskEntity[]);

      const result = await repository.findMany(where);

      expect(typeOrmRepository.find).toHaveBeenCalledWith({ where });
      expect(result).toEqual(mockTasks);
    });

    it('should use base repository update method', async () => {
      const taskId = 'task-123';
      const updateData = { status: TaskStatus.COMPLETED };

      typeOrmRepository.update.mockResolvedValue({ affected: 1 } as any);

      await repository.update(taskId, updateData);

      expect(typeOrmRepository.update).toHaveBeenCalledWith(taskId, updateData);
    });
  });
});
