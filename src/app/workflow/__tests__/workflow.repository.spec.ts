import { Repository } from 'typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WorkflowEntityMockFactory } from '@test/mocks';
import { WorkflowRepository } from '../workflow.repository';
import { WorkflowEntity } from '../workflow.entity';
import { TaskType } from '../../task/types/task-type.enum';

describe('WorkflowRepository', () => {
  let repository: WorkflowRepository;
  let typeOrmRepository: jest.Mocked<Repository<WorkflowEntity>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowRepository,
        {
          provide: getRepositoryToken(WorkflowEntity),
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

    repository = module.get<WorkflowRepository>(WorkflowRepository);
    typeOrmRepository = module.get(getRepositoryToken(WorkflowEntity));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findActiveWorkflows', () => {
    it('should find active workflows with tasks', async () => {
      const mockWorkflows = WorkflowEntityMockFactory.createArray(3, {
        isActive: true,
      });

      typeOrmRepository.find.mockResolvedValue(
        mockWorkflows as WorkflowEntity[],
      );

      const result = await repository.findActiveWorkflows();

      expect(typeOrmRepository.find).toHaveBeenCalledWith({
        where: { isActive: true },
        relations: ['tasks'],
      });
      expect(result).toEqual(mockWorkflows);
    });

    it('should return empty array when no active workflows found', async () => {
      typeOrmRepository.find.mockResolvedValue([]);

      const result = await repository.findActiveWorkflows();

      expect(result).toEqual([]);
    });
  });

  describe('findWithTasks', () => {
    it('should find workflow with tasks and children', async () => {
      const workflowId = 'workflow-123';
      const mockWorkflow = WorkflowEntityMockFactory.create({
        id: workflowId,
        tasks: [],
      });

      typeOrmRepository.findOne.mockResolvedValue(
        mockWorkflow as WorkflowEntity,
      );

      const result = await repository.findWithTasks(workflowId);

      expect(typeOrmRepository.findOne).toHaveBeenCalledWith({
        where: { id: workflowId },
        relations: ['tasks', 'tasks.children'],
      });
      expect(result).toEqual(mockWorkflow);
    });

    it('should throw error when workflow not found', async () => {
      const workflowId = 'non-existent-workflow';

      typeOrmRepository.findOne.mockResolvedValue(null);

      await expect(repository.findWithTasks(workflowId)).rejects.toThrow(
        `Workflow with id ${workflowId} not found.`,
      );

      expect(typeOrmRepository.findOne).toHaveBeenCalledWith({
        where: { id: workflowId },
        relations: ['tasks', 'tasks.children'],
      });
    });
  });

  describe('inherited methods', () => {
    it('should use base repository create method', async () => {
      const workflowData = {
        name: 'Test Workflow',
        definition: {
          initialTask: { type: TaskType.HTTP_REQUEST, payload: {} },
          transitions: {},
        },
        isActive: true,
      };
      const mockWorkflow = WorkflowEntityMockFactory.create(workflowData);

      typeOrmRepository.create.mockReturnValue(mockWorkflow as WorkflowEntity);
      typeOrmRepository.save.mockResolvedValue(mockWorkflow as WorkflowEntity);

      const result = await repository.create(workflowData);

      expect(typeOrmRepository.create).toHaveBeenCalledWith(workflowData);
      expect(typeOrmRepository.save).toHaveBeenCalledWith(mockWorkflow);
      expect(result).toEqual(mockWorkflow);
    });

    it('should use base repository findById method', async () => {
      const workflowId = 'workflow-123';
      const mockWorkflow = WorkflowEntityMockFactory.create({ id: workflowId });

      typeOrmRepository.findOne.mockResolvedValue(
        mockWorkflow as WorkflowEntity,
      );

      const result = await repository.findById(workflowId);

      expect(typeOrmRepository.findOne).toHaveBeenCalledWith({
        where: { id: workflowId },
      });
      expect(result).toEqual(mockWorkflow);
    });

    it('should use base repository findMany method', async () => {
      const where = { isActive: true };
      const mockWorkflows = WorkflowEntityMockFactory.createArray(2, {
        isActive: true,
      });

      typeOrmRepository.find.mockResolvedValue(
        mockWorkflows as WorkflowEntity[],
      );

      const result = await repository.findMany(where);

      expect(typeOrmRepository.find).toHaveBeenCalledWith({ where });
      expect(result).toEqual(mockWorkflows);
    });

    it('should use base repository update method', async () => {
      const workflowId = 'workflow-123';
      const updateData = { isActive: false };

      typeOrmRepository.update.mockResolvedValue({ affected: 1 } as any);

      await repository.update(workflowId, updateData);

      expect(typeOrmRepository.update).toHaveBeenCalledWith(
        workflowId,
        updateData,
      );
    });

    it('should use base repository findByIdWithRelations method', async () => {
      const workflowId = 'workflow-123';
      const relations = ['tasks'];
      const mockWorkflow = WorkflowEntityMockFactory.create({ id: workflowId });

      typeOrmRepository.findOne.mockResolvedValue(
        mockWorkflow as WorkflowEntity,
      );

      const result = await repository.findByIdWithRelations(
        workflowId,
        relations,
      );

      expect(typeOrmRepository.findOne).toHaveBeenCalledWith({
        where: { id: workflowId },
        relations,
      });
      expect(result).toEqual(mockWorkflow);
    });
  });
});
