import { Test, TestingModule } from '@nestjs/testing';
import { WorkflowEntityMockFactory } from '@test/mocks';
import { TaskEntityMockFactory } from '@test/mocks';
import { WorkflowService } from '../workflow.service';
import { WorkflowRepository } from '../workflow.repository';
import { TaskService } from '../../task/task.service';
import { TaskStatus } from '../../task/types/task-status.enum';
import { WorkflowStatus } from '../workflow.entity';
import { ICreateWorkflowDto, IUpdateWorkflowDto } from '../types';

describe('WorkflowService', () => {
  let service: WorkflowService;
  let workflowRepository: jest.Mocked<WorkflowRepository>;
  let taskService: jest.Mocked<TaskService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowService,
        {
          provide: WorkflowRepository,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findMany: jest.fn(),
            findActiveWorkflows: jest.fn(),
            findById: jest.fn(),
            findWithTasks: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: TaskService,
          useValue: {
            getTaskByIdWithWorkflow: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WorkflowService>(WorkflowService);
    workflowRepository = module.get(WorkflowRepository);
    taskService = module.get(TaskService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createWorkflow', () => {
    it('should create a workflow successfully', async () => {
      const createWorkflowDto: ICreateWorkflowDto = {
        name: 'Test Workflow',
        definition: {
          initialTask: {
            type: 'http_request' as any,
            payload: { url: 'https://api.example.com' },
          },
          transitions: {},
        },
        isActive: true,
      };

      const mockWorkflow = WorkflowEntityMockFactory.create({
        name: 'Test Workflow',
        isActive: true,
      });

      workflowRepository.create.mockResolvedValue(mockWorkflow as any);

      const result = await service.createWorkflow(createWorkflowDto);

      expect(workflowRepository.create).toHaveBeenCalledWith({
        name: 'Test Workflow',
        definition: createWorkflowDto.definition,
        isActive: true,
      });
      expect(result).toEqual(mockWorkflow);
    });

    it('should create a workflow with default isActive value', async () => {
      const createWorkflowDto: ICreateWorkflowDto = {
        name: 'Test Workflow',
        definition: {
          initialTask: {
            type: 'http_request' as any,
            payload: { url: 'https://api.example.com' },
          },
          transitions: {},
        },
      };

      const mockWorkflow = WorkflowEntityMockFactory.create({
        name: 'Test Workflow',
        isActive: true,
      });

      workflowRepository.create.mockResolvedValue(mockWorkflow as any);

      await service.createWorkflow(createWorkflowDto);

      expect(workflowRepository.create).toHaveBeenCalledWith({
        name: 'Test Workflow',
        definition: createWorkflowDto.definition,
        isActive: true,
      });
    });
  });

  describe('getAllWorkflows', () => {
    it('should return all workflows when no filter is provided', async () => {
      const mockWorkflows = WorkflowEntityMockFactory.createArray(3);
      workflowRepository.findAll.mockResolvedValue(mockWorkflows as any);

      const result = await service.getAllWorkflows();

      expect(workflowRepository.findAll).toHaveBeenCalled();
      expect(result).toEqual(mockWorkflows);
    });

    it('should return filtered workflows when active filter is provided', async () => {
      const mockWorkflows = WorkflowEntityMockFactory.createArray(2, {
        isActive: true,
      });
      workflowRepository.findMany.mockResolvedValue(mockWorkflows as any);

      const result = await service.getAllWorkflows(true);

      expect(workflowRepository.findMany).toHaveBeenCalledWith({
        isActive: true,
      });
      expect(result).toEqual(mockWorkflows);
    });

    it('should return inactive workflows when active filter is false', async () => {
      const mockWorkflows = WorkflowEntityMockFactory.createArray(1, {
        isActive: false,
      });
      workflowRepository.findMany.mockResolvedValue(mockWorkflows as any);

      const result = await service.getAllWorkflows(false);

      expect(workflowRepository.findMany).toHaveBeenCalledWith({
        isActive: false,
      });
      expect(result).toEqual(mockWorkflows);
    });
  });

  describe('getActiveWorkflows', () => {
    it('should return active workflows', async () => {
      const mockWorkflows = WorkflowEntityMockFactory.createArray(2, {
        isActive: true,
      });
      workflowRepository.findActiveWorkflows.mockResolvedValue(
        mockWorkflows as any,
      );

      const result = await service.getActiveWorkflows();

      expect(workflowRepository.findActiveWorkflows).toHaveBeenCalled();
      expect(result).toEqual(mockWorkflows);
    });
  });

  describe('getWorkflowById', () => {
    it('should return workflow by id', async () => {
      const workflowId = 'workflow-123';
      const mockWorkflow = WorkflowEntityMockFactory.create({
        id: workflowId,
      });
      workflowRepository.findById.mockResolvedValue(mockWorkflow as any);

      const result = await service.getWorkflowById(workflowId);

      expect(workflowRepository.findById).toHaveBeenCalledWith(workflowId);
      expect(result).toEqual(mockWorkflow);
    });

    it('should return null when workflow not found', async () => {
      const workflowId = 'non-existent-workflow';
      workflowRepository.findById.mockResolvedValue(null);

      const result = await service.getWorkflowById(workflowId);

      expect(workflowRepository.findById).toHaveBeenCalledWith(workflowId);
      expect(result).toBeNull();
    });
  });

  describe('getWorkflowWithTasks', () => {
    it('should return workflow with tasks', async () => {
      const workflowId = 'workflow-123';
      const mockWorkflow = WorkflowEntityMockFactory.create({
        id: workflowId,
        tasks: [],
      });
      workflowRepository.findWithTasks.mockResolvedValue(mockWorkflow as any);

      const result = await service.getWorkflowWithTasks(workflowId);

      expect(workflowRepository.findWithTasks).toHaveBeenCalledWith(workflowId);
      expect(result).toEqual(mockWorkflow);
    });

    it('should return null when workflow not found', async () => {
      const workflowId = 'non-existent-workflow';
      workflowRepository.findWithTasks.mockRejectedValue(
        new Error('Workflow not found'),
      );

      const result = await service.getWorkflowWithTasks(workflowId);

      expect(workflowRepository.findWithTasks).toHaveBeenCalledWith(workflowId);
      expect(result).toBeNull();
    });
  });

  describe('updateWorkflow', () => {
    it('should update workflow successfully', async () => {
      const workflowId = 'workflow-123';
      const updateWorkflowDto: IUpdateWorkflowDto = {
        name: 'Updated Workflow',
        isActive: false,
      };

      const existingWorkflow = WorkflowEntityMockFactory.create({
        id: workflowId,
        name: 'Original Workflow',
        isActive: true,
      });
      const updatedWorkflow = WorkflowEntityMockFactory.create({
        id: workflowId,
        name: 'Updated Workflow',
        isActive: false,
      });

      workflowRepository.findById.mockResolvedValue(existingWorkflow as any);
      workflowRepository.update.mockResolvedValue(updatedWorkflow as any);

      const result = await service.updateWorkflow(
        workflowId,
        updateWorkflowDto,
      );

      expect(workflowRepository.findById).toHaveBeenCalledWith(workflowId);
      expect(workflowRepository.update).toHaveBeenCalledWith(
        workflowId,
        updateWorkflowDto,
      );
      expect(result).toEqual(updatedWorkflow);
    });

    it('should return null when workflow not found', async () => {
      const workflowId = 'non-existent-workflow';
      const updateWorkflowDto: IUpdateWorkflowDto = {
        name: 'Updated Workflow',
      };

      workflowRepository.findById.mockResolvedValue(null);

      const result = await service.updateWorkflow(
        workflowId,
        updateWorkflowDto,
      );

      expect(workflowRepository.findById).toHaveBeenCalledWith(workflowId);
      expect(workflowRepository.update).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe('deleteWorkflow', () => {
    it('should delete workflow successfully', async () => {
      const workflowId = 'workflow-123';
      const mockWorkflow = WorkflowEntityMockFactory.create({
        id: workflowId,
        tasks: [],
      });

      workflowRepository.findById.mockResolvedValue(mockWorkflow as any);
      workflowRepository.findWithTasks.mockResolvedValue(mockWorkflow as any);
      workflowRepository.delete.mockResolvedValue(true);

      const result = await service.deleteWorkflow(workflowId);

      expect(workflowRepository.findById).toHaveBeenCalledWith(workflowId);
      expect(workflowRepository.findWithTasks).toHaveBeenCalledWith(workflowId);
      expect(workflowRepository.delete).toHaveBeenCalledWith(workflowId);
      expect(result).toBe(true);
    });

    it('should return false when workflow not found', async () => {
      const workflowId = 'non-existent-workflow';

      workflowRepository.findById.mockResolvedValue(null);

      const result = await service.deleteWorkflow(workflowId);

      expect(workflowRepository.findById).toHaveBeenCalledWith(workflowId);
      expect(workflowRepository.delete).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('should throw error when workflow has existing tasks', async () => {
      const workflowId = 'workflow-with-tasks';
      const mockWorkflow = WorkflowEntityMockFactory.create({
        id: workflowId,
        tasks: [TaskEntityMockFactory.create()],
      });

      workflowRepository.findById.mockResolvedValue(mockWorkflow as any);
      workflowRepository.findWithTasks.mockResolvedValue(mockWorkflow as any);

      await expect(service.deleteWorkflow(workflowId)).rejects.toThrow(
        'Cannot delete workflow with existing tasks',
      );

      expect(workflowRepository.findById).toHaveBeenCalledWith(workflowId);
      expect(workflowRepository.findWithTasks).toHaveBeenCalledWith(workflowId);
      expect(workflowRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('getWorkflowStatus', () => {
    it('should return workflow status with task statistics', async () => {
      const workflowId = 'workflow-123';
      const mockTasks = [
        TaskEntityMockFactory.create({
          status: TaskStatus.COMPLETED,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
        }),
        TaskEntityMockFactory.create({
          status: TaskStatus.FAILED,
          error: 'Task failed',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
        }),
        TaskEntityMockFactory.create({
          status: TaskStatus.PENDING,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        }),
      ];

      const mockWorkflow = WorkflowEntityMockFactory.create({
        id: workflowId,
        name: 'Test Workflow',
        isActive: true,
        tasks: mockTasks,
      });

      workflowRepository.findWithTasks.mockResolvedValue(mockWorkflow as any);

      const result = await service.getWorkflowStatus(workflowId);

      expect(workflowRepository.findWithTasks).toHaveBeenCalledWith(workflowId);
      expect(result).toEqual({
        workflowId,
        workflowName: 'Test Workflow',
        isActive: true,
        totalTasks: 3,
        completedTasks: 1,
        failedTasks: 1,
        pendingTasks: 1,
        processingTasks: 0,
        isComplete: false,
        hasFailures: true,
        isInProgress: true,
        progress: 33,
        tasks: mockTasks.map((task) => ({
          id: task.id,
          type: task.type,
          status: task.status,
          createdAt: task.createdAt,
          completedAt:
            task.status === TaskStatus.COMPLETED ? task.updatedAt : null,
          error: task.error,
        })),
      });
    });

    it('should return null when workflow not found', async () => {
      const workflowId = 'non-existent-workflow';

      workflowRepository.findWithTasks.mockResolvedValue(null as any);

      const result = await service.getWorkflowStatus(workflowId);

      expect(workflowRepository.findWithTasks).toHaveBeenCalledWith(workflowId);
      expect(result).toBeNull();
    });

    it('should handle workflow with no tasks', async () => {
      const workflowId = 'workflow-no-tasks';
      const mockWorkflow = WorkflowEntityMockFactory.create({
        id: workflowId,
        name: 'Test Workflow',
        isActive: true,
        tasks: [],
      });

      workflowRepository.findWithTasks.mockResolvedValue(mockWorkflow as any);

      const result = await service.getWorkflowStatus(workflowId);

      expect(result).toEqual({
        workflowId,
        workflowName: 'Test Workflow',
        isActive: true,
        totalTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        pendingTasks: 0,
        processingTasks: 0,
        isComplete: false,
        hasFailures: false,
        isInProgress: false,
        progress: 0,
        tasks: [],
      });
    });
  });

  describe('updateWorkflowStatus', () => {
    it('should update workflow status successfully', async () => {
      const workflowId = 'workflow-123';
      const status = WorkflowStatus.RUNNING;
      const error = 'Some error occurred';

      const updatedWorkflow = WorkflowEntityMockFactory.create({
        id: workflowId,
        status,
        error,
      });

      workflowRepository.update.mockResolvedValue(updatedWorkflow as any);

      const result = await service.updateWorkflowStatus(
        workflowId,
        status,
        error,
      );

      expect(workflowRepository.update).toHaveBeenCalledWith(workflowId, {
        status,
        error,
      });
      expect(result).toEqual(updatedWorkflow);
    });

    it('should update workflow status without error', async () => {
      const workflowId = 'workflow-123';
      const status = WorkflowStatus.COMPLETED;

      const updatedWorkflow = WorkflowEntityMockFactory.create({
        id: workflowId,
        status,
      });

      workflowRepository.update.mockResolvedValue(updatedWorkflow as any);

      const result = await service.updateWorkflowStatus(workflowId, status);

      expect(workflowRepository.update).toHaveBeenCalledWith(workflowId, {
        status,
      });
      expect(result).toEqual(updatedWorkflow);
    });
  });

  describe('calculateTaskStats', () => {
    it('should calculate correct statistics for mixed task statuses', () => {
      const mockTasks = [
        TaskEntityMockFactory.create({ status: TaskStatus.COMPLETED }),
        TaskEntityMockFactory.create({ status: TaskStatus.COMPLETED }),
        TaskEntityMockFactory.create({ status: TaskStatus.FAILED }),
        TaskEntityMockFactory.create({ status: TaskStatus.PENDING }),
        TaskEntityMockFactory.create({ status: TaskStatus.PROCESSING }),
      ];

      const stats = (service as any).calculateTaskStats(mockTasks);

      expect(stats).toEqual({
        totalTasks: 5,
        completedTasks: 2,
        failedTasks: 1,
        pendingTasks: 1,
        processingTasks: 1,
        isComplete: false,
        hasFailures: true,
        isInProgress: true,
        progress: 40,
      });
    });

    it('should calculate complete workflow statistics', () => {
      const mockTasks = [
        TaskEntityMockFactory.create({ status: TaskStatus.COMPLETED }),
        TaskEntityMockFactory.create({ status: TaskStatus.COMPLETED }),
        TaskEntityMockFactory.create({ status: TaskStatus.COMPLETED }),
      ];

      const stats = (service as any).calculateTaskStats(mockTasks);

      expect(stats).toEqual({
        totalTasks: 3,
        completedTasks: 3,
        failedTasks: 0,
        pendingTasks: 0,
        processingTasks: 0,
        isComplete: true,
        hasFailures: false,
        isInProgress: false,
        progress: 100,
      });
    });

    it('should handle empty tasks array', () => {
      const stats = (service as any).calculateTaskStats([]);

      expect(stats).toEqual({
        totalTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        pendingTasks: 0,
        processingTasks: 0,
        isComplete: false,
        hasFailures: false,
        isInProgress: false,
        progress: 0,
      });
    });
  });
});
