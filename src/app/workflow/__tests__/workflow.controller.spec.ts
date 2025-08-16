import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { WorkflowEntityMockFactory } from '@test/mocks';
import { TaskEntityMockFactory } from '@test/mocks';
import { WorkflowController } from '../workflow.controller';
import { TaskStatus } from '../../task/types/task-status.enum';
import { ICreateWorkflowDto, IUpdateWorkflowDto } from '../types';
import { CoordinatorService } from '../services/coordinator.service';
import { WorkflowService } from '../services/workflow.service';
import { WorkflowResponseService } from '../services/workflow-response.service';

describe('WorkflowController', () => {
  let controller: WorkflowController;
  let workflowService: jest.Mocked<WorkflowService>;
  let coordinatorService: jest.Mocked<CoordinatorService>;
  let responseService: jest.Mocked<WorkflowResponseService>;

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
        {
          provide: WorkflowResponseService,
          useValue: {
            createWorkflowResponse: jest.fn(),
            createWorkflowListResponse: jest.fn(),
            createSuccessResponse: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<WorkflowController>(WorkflowController);
    workflowService = module.get(WorkflowService);
    coordinatorService = module.get(CoordinatorService);
    responseService = module.get(WorkflowResponseService);
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

      const expectedResponse = {
        message: 'Workflow operation successful',
        workflow: mockWorkflow,
      };

      workflowService.createWorkflow.mockResolvedValue(mockWorkflow as any);
      responseService.createWorkflowResponse.mockReturnValue(expectedResponse);

      const result = await controller.createWorkflow(createWorkflowDto);

      expect(workflowService.createWorkflow).toHaveBeenCalledWith(
        createWorkflowDto,
      );
      expect(responseService.createWorkflowResponse).toHaveBeenCalledWith(
        mockWorkflow,
      );
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('getAllWorkflows', () => {
    it('should return all workflows when no filter is provided', async () => {
      const mockWorkflows = WorkflowEntityMockFactory.createArray(3);
      const expectedResponse = {
        message: 'Workflows retrieved successfully',
        workflows: mockWorkflows,
        total: 3,
      };

      workflowService.getAllWorkflows.mockResolvedValue(mockWorkflows as any);
      responseService.createWorkflowListResponse.mockReturnValue(
        expectedResponse,
      );

      const result = await controller.getAllWorkflows();

      expect(workflowService.getAllWorkflows).toHaveBeenCalledWith(undefined);
      expect(responseService.createWorkflowListResponse).toHaveBeenCalledWith(
        mockWorkflows,
      );
      expect(result).toEqual(expectedResponse);
    });

    it('should return filtered workflows when active filter is provided', async () => {
      const mockWorkflows = WorkflowEntityMockFactory.createArray(2, {
        isActive: true,
      });
      const expectedResponse = {
        message: 'Workflows retrieved successfully',
        workflows: mockWorkflows,
        total: 2,
      };

      workflowService.getAllWorkflows.mockResolvedValue(mockWorkflows as any);
      responseService.createWorkflowListResponse.mockReturnValue(
        expectedResponse,
      );

      const result = await controller.getAllWorkflows(true);

      expect(workflowService.getAllWorkflows).toHaveBeenCalledWith(true);
      expect(responseService.createWorkflowListResponse).toHaveBeenCalledWith(
        mockWorkflows,
      );
      expect(result).toEqual(expectedResponse);
    });

    it('should return inactive workflows when active filter is false', async () => {
      const mockWorkflows = WorkflowEntityMockFactory.createArray(1, {
        isActive: false,
      });
      const expectedResponse = {
        message: 'Workflows retrieved successfully',
        workflows: mockWorkflows,
        total: 1,
      };

      workflowService.getAllWorkflows.mockResolvedValue(mockWorkflows as any);
      responseService.createWorkflowListResponse.mockReturnValue(
        expectedResponse,
      );

      const result = await controller.getAllWorkflows(false);

      expect(workflowService.getAllWorkflows).toHaveBeenCalledWith(false);
      expect(responseService.createWorkflowListResponse).toHaveBeenCalledWith(
        mockWorkflows,
      );
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('getActiveWorkflows', () => {
    it('should return active workflows', async () => {
      const mockWorkflows = WorkflowEntityMockFactory.createArray(2, {
        isActive: true,
      });
      const expectedResponse = {
        message: 'Active workflows retrieved successfully',
        workflows: mockWorkflows,
        total: 2,
      };

      workflowService.getActiveWorkflows.mockResolvedValue(
        mockWorkflows as any,
      );
      responseService.createWorkflowListResponse.mockReturnValue(
        expectedResponse,
      );

      const result = await controller.getActiveWorkflows();

      expect(workflowService.getActiveWorkflows).toHaveBeenCalled();
      expect(responseService.createWorkflowListResponse).toHaveBeenCalledWith(
        mockWorkflows,
        'Active workflows retrieved successfully',
      );
      expect(result).toEqual(expectedResponse);
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

      const mockWorkflow = WorkflowEntityMockFactory.create({
        id: workflowId,
        name: 'Updated Workflow',
        isActive: false,
      });

      const expectedResponse = {
        message: 'Workflow operation successful',
        workflow: mockWorkflow,
      };

      workflowService.updateWorkflow.mockResolvedValue(mockWorkflow as any);
      responseService.createWorkflowResponse.mockReturnValue(expectedResponse);

      const result = await controller.updateWorkflow(
        workflowId,
        updateWorkflowDto,
      );

      expect(workflowService.updateWorkflow).toHaveBeenCalledWith(
        workflowId,
        updateWorkflowDto,
      );
      expect(responseService.createWorkflowResponse).toHaveBeenCalledWith(
        mockWorkflow,
      );
      expect(result).toEqual(expectedResponse);
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
      const expectedResponse = {
        message: 'Workflow deleted successfully',
      };

      workflowService.deleteWorkflow.mockResolvedValue(true);
      responseService.createSuccessResponse.mockReturnValue(expectedResponse);

      const result = await controller.deleteWorkflow(workflowId);

      expect(workflowService.deleteWorkflow).toHaveBeenCalledWith(workflowId);
      expect(responseService.createSuccessResponse).toHaveBeenCalledWith(
        'Workflow deleted successfully',
      );
      expect(result).toEqual(expectedResponse);
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

      const expectedResponse = {
        message: 'Workflow started successfully',
        workflowId: workflowId,
      };

      workflowService.getWorkflowById.mockResolvedValue(mockWorkflow as any);
      coordinatorService.startWorkflow.mockResolvedValue();
      responseService.createSuccessResponse.mockReturnValue(expectedResponse);

      const result = await controller.startWorkflow(workflowId);

      expect(workflowService.getWorkflowById).toHaveBeenCalledWith(workflowId);
      expect(coordinatorService.startWorkflow).toHaveBeenCalledWith(
        mockWorkflow,
      );
      expect(responseService.createSuccessResponse).toHaveBeenCalledWith(
        'Workflow started successfully',
        { workflowId: workflowId },
      );
      expect(result).toEqual(expectedResponse);
    });

    it('should throw NotFoundException when workflow not found', async () => {
      const workflowId = 'non-existent-workflow';
      workflowService.getWorkflowById.mockResolvedValue(null);

      await expect(controller.startWorkflow(workflowId)).rejects.toThrow(
        NotFoundException,
      );

      expect(workflowService.getWorkflowById).toHaveBeenCalledWith(workflowId);
    });

    it('should throw error when workflow is inactive', async () => {
      const workflowId = 'workflow-123';
      const mockWorkflow = WorkflowEntityMockFactory.create({
        id: workflowId,
        isActive: false,
      });

      workflowService.getWorkflowById.mockResolvedValue(mockWorkflow as any);

      await expect(controller.startWorkflow(workflowId)).rejects.toThrow(
        'Cannot start inactive workflow',
      );

      expect(workflowService.getWorkflowById).toHaveBeenCalledWith(workflowId);
    });
  });

  describe('activateWorkflow', () => {
    it('should activate workflow successfully', async () => {
      const workflowId = 'workflow-123';
      const mockWorkflow = WorkflowEntityMockFactory.create({
        id: workflowId,
        isActive: true,
      });

      const expectedResponse = {
        message: 'Workflow operation successful',
        workflow: mockWorkflow,
      };

      workflowService.updateWorkflow.mockResolvedValue(mockWorkflow as any);
      responseService.createWorkflowResponse.mockReturnValue(expectedResponse);

      const result = await controller.activateWorkflow(workflowId);

      expect(workflowService.updateWorkflow).toHaveBeenCalledWith(workflowId, {
        isActive: true,
      });
      expect(responseService.createWorkflowResponse).toHaveBeenCalledWith(
        mockWorkflow,
      );
      expect(result).toEqual(expectedResponse);
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
      const mockWorkflow = WorkflowEntityMockFactory.create({
        id: workflowId,
        isActive: false,
      });

      const expectedResponse = {
        message: 'Workflow operation successful',
        workflow: mockWorkflow,
      };

      workflowService.updateWorkflow.mockResolvedValue(mockWorkflow as any);
      responseService.createWorkflowResponse.mockReturnValue(expectedResponse);

      const result = await controller.deactivateWorkflow(workflowId);

      expect(workflowService.updateWorkflow).toHaveBeenCalledWith(workflowId, {
        isActive: false,
      });
      expect(responseService.createWorkflowResponse).toHaveBeenCalledWith(
        mockWorkflow,
      );
      expect(result).toEqual(expectedResponse);
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
      const mockStatus = {
        workflowId,
        workflowName: 'Test Workflow',
        isActive: true,
        totalTasks: 5,
        completedTasks: 2,
        failedTasks: 1,
        pendingTasks: 1,
        processingTasks: 1,
        isComplete: false,
        hasFailures: true,
        isInProgress: true,
        progress: 40,
        tasks: [],
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
});
