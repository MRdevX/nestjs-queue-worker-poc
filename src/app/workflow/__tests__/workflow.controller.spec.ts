import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { WorkflowEntityMockFactory } from '@test/mocks';
import { TaskEntityMockFactory } from '@test/mocks';
import { WorkflowController } from '../workflow.controller';
import { WorkflowService } from '../workflow.service';
import { CoordinatorService } from '../coordinator.service';
import { TaskStatus } from '../../task/types/task-status.enum';
import { ICreateWorkflowDto, IUpdateWorkflowDto } from '../types';

describe('WorkflowController', () => {
  let controller: WorkflowController;
  let workflowService: jest.Mocked<WorkflowService>;
  let coordinatorService: jest.Mocked<CoordinatorService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkflowController],
      providers: [
        {
          provide: WorkflowService,
          useValue: {
            createWorkflow: jest.fn(),
            getAllWorkflows: jest.fn(),
            getActiveWorkflows: jest.fn(),
            getWorkflowById: jest.fn(),
            getWorkflowWithTasks: jest.fn(),
            updateWorkflow: jest.fn(),
            deleteWorkflow: jest.fn(),
            getWorkflowStatus: jest.fn(),
          },
        },
        {
          provide: CoordinatorService,
          useValue: {
            startWorkflow: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<WorkflowController>(WorkflowController);
    workflowService = module.get(WorkflowService);
    coordinatorService = module.get(CoordinatorService);
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

      workflowService.createWorkflow.mockResolvedValue(mockWorkflow as any);

      const result = await controller.createWorkflow(createWorkflowDto);

      expect(workflowService.createWorkflow).toHaveBeenCalledWith(
        createWorkflowDto,
      );
      expect(result).toEqual({
        message: 'Workflow created successfully',
        workflow: mockWorkflow,
      });
    });
  });

  describe('getAllWorkflows', () => {
    it('should return all workflows when no filter is provided', async () => {
      const mockWorkflows = WorkflowEntityMockFactory.createArray(3);
      workflowService.getAllWorkflows.mockResolvedValue(mockWorkflows as any);

      const result = await controller.getAllWorkflows();

      expect(workflowService.getAllWorkflows).toHaveBeenCalledWith(undefined);
      expect(result).toEqual({
        message: 'Workflows retrieved successfully',
        workflows: mockWorkflows,
        total: 3,
      });
    });

    it('should return filtered workflows when active filter is provided', async () => {
      const mockWorkflows = WorkflowEntityMockFactory.createArray(2, {
        isActive: true,
      });
      workflowService.getAllWorkflows.mockResolvedValue(mockWorkflows as any);

      const result = await controller.getAllWorkflows(true);

      expect(workflowService.getAllWorkflows).toHaveBeenCalledWith(true);
      expect(result).toEqual({
        message: 'Workflows retrieved successfully',
        workflows: mockWorkflows,
        total: 2,
      });
    });

    it('should return inactive workflows when active filter is false', async () => {
      const mockWorkflows = WorkflowEntityMockFactory.createArray(1, {
        isActive: false,
      });
      workflowService.getAllWorkflows.mockResolvedValue(mockWorkflows as any);

      const result = await controller.getAllWorkflows(false);

      expect(workflowService.getAllWorkflows).toHaveBeenCalledWith(false);
      expect(result).toEqual({
        message: 'Workflows retrieved successfully',
        workflows: mockWorkflows,
        total: 1,
      });
    });
  });

  describe('getActiveWorkflows', () => {
    it('should return active workflows', async () => {
      const mockWorkflows = WorkflowEntityMockFactory.createArray(2, {
        isActive: true,
      });
      workflowService.getActiveWorkflows.mockResolvedValue(
        mockWorkflows as any,
      );

      const result = await controller.getActiveWorkflows();

      expect(workflowService.getActiveWorkflows).toHaveBeenCalled();
      expect(result).toEqual({
        message: 'Active workflows retrieved successfully',
        workflows: mockWorkflows,
        total: 2,
      });
    });
  });

  describe('getWorkflow', () => {
    it('should return workflow by id', async () => {
      const workflowId = 'workflow-123';
      const mockWorkflow = WorkflowEntityMockFactory.create({
        id: workflowId,
      });
      workflowService.getWorkflowById.mockResolvedValue(mockWorkflow as any);

      const result = await controller.getWorkflow(workflowId);

      expect(workflowService.getWorkflowById).toHaveBeenCalledWith(workflowId);
      expect(result).toEqual(mockWorkflow);
    });

    it('should throw NotFoundException when workflow not found', async () => {
      const workflowId = 'non-existent-workflow';
      workflowService.getWorkflowById.mockResolvedValue(null);

      await expect(controller.getWorkflow(workflowId)).rejects.toThrow(
        NotFoundException,
      );

      expect(workflowService.getWorkflowById).toHaveBeenCalledWith(workflowId);
    });
  });

  describe('getWorkflowWithTasks', () => {
    it('should return workflow with tasks', async () => {
      const workflowId = 'workflow-123';
      const mockWorkflow = WorkflowEntityMockFactory.create({
        id: workflowId,
        tasks: [],
      });
      workflowService.getWorkflowWithTasks.mockResolvedValue(
        mockWorkflow as any,
      );

      const result = await controller.getWorkflowWithTasks(workflowId);

      expect(workflowService.getWorkflowWithTasks).toHaveBeenCalledWith(
        workflowId,
      );
      expect(result).toEqual(mockWorkflow);
    });

    it('should throw NotFoundException when workflow not found', async () => {
      const workflowId = 'non-existent-workflow';
      workflowService.getWorkflowWithTasks.mockResolvedValue(null);

      await expect(controller.getWorkflowWithTasks(workflowId)).rejects.toThrow(
        NotFoundException,
      );

      expect(workflowService.getWorkflowWithTasks).toHaveBeenCalledWith(
        workflowId,
      );
    });
  });

  describe('updateWorkflow', () => {
    it('should update workflow successfully', async () => {
      const workflowId = 'workflow-123';
      const updateWorkflowDto: IUpdateWorkflowDto = {
        name: 'Updated Workflow',
        isActive: false,
      };

      const updatedWorkflow = WorkflowEntityMockFactory.create({
        id: workflowId,
        name: 'Updated Workflow',
        isActive: false,
      });

      workflowService.updateWorkflow.mockResolvedValue(updatedWorkflow as any);

      const result = await controller.updateWorkflow(
        workflowId,
        updateWorkflowDto,
      );

      expect(workflowService.updateWorkflow).toHaveBeenCalledWith(
        workflowId,
        updateWorkflowDto,
      );
      expect(result).toEqual({
        message: 'Workflow updated successfully',
        workflow: updatedWorkflow,
      });
    });

    it('should throw NotFoundException when workflow not found', async () => {
      const workflowId = 'non-existent-workflow';
      const updateWorkflowDto: IUpdateWorkflowDto = {
        name: 'Updated Workflow',
      };

      workflowService.updateWorkflow.mockResolvedValue(null);

      await expect(
        controller.updateWorkflow(workflowId, updateWorkflowDto),
      ).rejects.toThrow(NotFoundException);

      expect(workflowService.updateWorkflow).toHaveBeenCalledWith(
        workflowId,
        updateWorkflowDto,
      );
    });
  });

  describe('deleteWorkflow', () => {
    it('should delete workflow successfully', async () => {
      const workflowId = 'workflow-123';
      workflowService.deleteWorkflow.mockResolvedValue(true);

      const result = await controller.deleteWorkflow(workflowId);

      expect(workflowService.deleteWorkflow).toHaveBeenCalledWith(workflowId);
      expect(result).toEqual({
        message: 'Workflow deleted successfully',
      });
    });

    it('should throw NotFoundException when workflow not found', async () => {
      const workflowId = 'non-existent-workflow';
      workflowService.deleteWorkflow.mockResolvedValue(false);

      await expect(controller.deleteWorkflow(workflowId)).rejects.toThrow(
        NotFoundException,
      );

      expect(workflowService.deleteWorkflow).toHaveBeenCalledWith(workflowId);
    });
  });

  describe('startWorkflow', () => {
    it('should start workflow successfully', async () => {
      const workflowId = 'workflow-123';
      const mockWorkflow = WorkflowEntityMockFactory.create({
        id: workflowId,
        isActive: true,
      });

      workflowService.getWorkflowById.mockResolvedValue(mockWorkflow as any);
      coordinatorService.startWorkflow.mockResolvedValue();

      const result = await controller.startWorkflow(workflowId);

      expect(workflowService.getWorkflowById).toHaveBeenCalledWith(workflowId);
      expect(coordinatorService.startWorkflow).toHaveBeenCalledWith(
        mockWorkflow,
      );
      expect(result).toEqual({
        message: 'Workflow started successfully',
        workflowId: workflowId,
      });
    });

    it('should throw NotFoundException when workflow not found', async () => {
      const workflowId = 'non-existent-workflow';
      workflowService.getWorkflowById.mockResolvedValue(null);

      await expect(controller.startWorkflow(workflowId)).rejects.toThrow(
        NotFoundException,
      );

      expect(workflowService.getWorkflowById).toHaveBeenCalledWith(workflowId);
      expect(coordinatorService.startWorkflow).not.toHaveBeenCalled();
    });

    it('should throw error when workflow is inactive', async () => {
      const workflowId = 'inactive-workflow';
      const mockWorkflow = WorkflowEntityMockFactory.create({
        id: workflowId,
        isActive: false,
      });

      workflowService.getWorkflowById.mockResolvedValue(mockWorkflow as any);

      await expect(controller.startWorkflow(workflowId)).rejects.toThrow(
        'Cannot start inactive workflow',
      );

      expect(workflowService.getWorkflowById).toHaveBeenCalledWith(workflowId);
      expect(coordinatorService.startWorkflow).not.toHaveBeenCalled();
    });
  });

  describe('activateWorkflow', () => {
    it('should activate workflow successfully', async () => {
      const workflowId = 'workflow-123';
      const updatedWorkflow = WorkflowEntityMockFactory.create({
        id: workflowId,
        isActive: true,
      });

      workflowService.updateWorkflow.mockResolvedValue(updatedWorkflow as any);

      const result = await controller.activateWorkflow(workflowId);

      expect(workflowService.updateWorkflow).toHaveBeenCalledWith(workflowId, {
        isActive: true,
      });
      expect(result).toEqual({
        message: 'Workflow activated successfully',
        workflow: updatedWorkflow,
      });
    });

    it('should throw NotFoundException when workflow not found', async () => {
      const workflowId = 'non-existent-workflow';
      workflowService.updateWorkflow.mockResolvedValue(null);

      await expect(controller.activateWorkflow(workflowId)).rejects.toThrow(
        NotFoundException,
      );

      expect(workflowService.updateWorkflow).toHaveBeenCalledWith(workflowId, {
        isActive: true,
      });
    });
  });

  describe('deactivateWorkflow', () => {
    it('should deactivate workflow successfully', async () => {
      const workflowId = 'workflow-123';
      const updatedWorkflow = WorkflowEntityMockFactory.create({
        id: workflowId,
        isActive: false,
      });

      workflowService.updateWorkflow.mockResolvedValue(updatedWorkflow as any);

      const result = await controller.deactivateWorkflow(workflowId);

      expect(workflowService.updateWorkflow).toHaveBeenCalledWith(workflowId, {
        isActive: false,
      });
      expect(result).toEqual({
        message: 'Workflow deactivated successfully',
        workflow: updatedWorkflow,
      });
    });

    it('should throw NotFoundException when workflow not found', async () => {
      const workflowId = 'non-existent-workflow';
      workflowService.updateWorkflow.mockResolvedValue(null);

      await expect(controller.deactivateWorkflow(workflowId)).rejects.toThrow(
        NotFoundException,
      );

      expect(workflowService.updateWorkflow).toHaveBeenCalledWith(workflowId, {
        isActive: false,
      });
    });
  });

  describe('getWorkflowStatus', () => {
    it('should return workflow status', async () => {
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
      ];

      const mockStatus = {
        workflowId,
        workflowName: 'Test Workflow',
        isActive: true,
        totalTasks: 2,
        completedTasks: 1,
        failedTasks: 1,
        pendingTasks: 0,
        processingTasks: 0,
        isComplete: false,
        hasFailures: true,
        isInProgress: false,
        progress: 50,
        tasks: mockTasks.map((task) => ({
          id: task.id!,
          type: task.type!,
          status: task.status!,
          createdAt: task.createdAt!,
          completedAt:
            task.status === TaskStatus.COMPLETED ? task.updatedAt! : null,
          error: task.error || null,
        })),
      };

      workflowService.getWorkflowStatus.mockResolvedValue(mockStatus);

      const result = await controller.getWorkflowStatus(workflowId);

      expect(workflowService.getWorkflowStatus).toHaveBeenCalledWith(
        workflowId,
      );
      expect(result).toEqual(mockStatus);
    });

    it('should throw NotFoundException when workflow not found', async () => {
      const workflowId = 'non-existent-workflow';
      workflowService.getWorkflowStatus.mockResolvedValue(null);

      await expect(controller.getWorkflowStatus(workflowId)).rejects.toThrow(
        NotFoundException,
      );

      expect(workflowService.getWorkflowStatus).toHaveBeenCalledWith(
        workflowId,
      );
    });
  });

  describe('createSuccessResponse', () => {
    it('should create success response with message only', () => {
      const result = (controller as any).createSuccessResponse('Test message');

      expect(result).toEqual({
        message: 'Test message',
      });
    });

    it('should create success response with message and data', () => {
      const data = { key: 'value' };
      const result = (controller as any).createSuccessResponse(
        'Test message',
        data,
      );

      expect(result).toEqual({
        message: 'Test message',
        key: 'value',
      });
    });
  });
});
