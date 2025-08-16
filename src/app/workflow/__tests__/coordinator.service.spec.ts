import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { WorkflowEntityMockFactory } from '@test/mocks';
import { TaskEntityMockFactory } from '@test/mocks';
import { TaskService } from '../../task/task.service';
import { MessagingService } from '../../core/messaging/services/messaging.service';
import { TaskType } from '../../task/types/task-type.enum';
import { TaskStatus } from '../../task/types/task-status.enum';
import { CoordinatorService } from '../services/coordinator.service';
import { WorkflowService } from '../services/workflow.service';
import { WorkflowExecutionService } from '../services/workflow-execution.service';
import { WorkflowCoordinationService } from '../services/workflow-coordination.service';

describe('CoordinatorService', () => {
  let service: CoordinatorService;
  let taskService: jest.Mocked<TaskService>;
  let messagingService: jest.Mocked<MessagingService>;
  let workflowExecutionService: jest.Mocked<WorkflowExecutionService>;
  let workflowCoordinationService: jest.Mocked<WorkflowCoordinationService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoordinatorService,
        {
          provide: WorkflowExecutionService,
          useValue: {
            startWorkflow: jest.fn(),
          },
        },
        {
          provide: WorkflowCoordinationService,
          useValue: {
            handleTaskCompletion: jest.fn(),
            handleTaskFailure: jest.fn(),
          },
        },
        {
          provide: TaskService,
          useValue: {
            createTask: jest.fn(),
            getTaskByIdWithWorkflow: jest.fn(),
          },
        },
        {
          provide: MessagingService,
          useValue: {
            publishTask: jest.fn(),
          },
        },
        {
          provide: WorkflowService,
          useValue: {
            updateWorkflowStatus: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CoordinatorService>(CoordinatorService);
    taskService = module.get(TaskService);
    messagingService = module.get(MessagingService);
    workflowExecutionService = module.get(WorkflowExecutionService);
    workflowCoordinationService = module.get(WorkflowCoordinationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('startWorkflow', () => {
    it('should start workflow successfully', async () => {
      const workflow = WorkflowEntityMockFactory.create({
        definition: {
          initialTask: {
            type: TaskType.HTTP_REQUEST,
            payload: { url: 'https://api.example.com' },
          },
          transitions: {},
        },
      });

      workflowExecutionService.startWorkflow.mockResolvedValue();

      await service.startWorkflow(workflow as any);

      expect(workflowExecutionService.startWorkflow).toHaveBeenCalledWith(
        workflow,
      );
    });

    it('should handle workflow start failure', async () => {
      const workflow = WorkflowEntityMockFactory.create({
        definition: {
          initialTask: {
            type: TaskType.HTTP_REQUEST,
            payload: { url: 'https://api.example.com' },
          },
          transitions: {},
        },
      });

      const error = new Error('Workflow start failed');
      workflowExecutionService.startWorkflow.mockRejectedValue(error);

      await expect(service.startWorkflow(workflow as any)).rejects.toThrow(
        'Workflow start failed',
      );

      expect(workflowExecutionService.startWorkflow).toHaveBeenCalledWith(
        workflow,
      );
    });
  });

  describe('handleTaskCompletion', () => {
    it('should handle task completion with next transition', async () => {
      const taskId = 'task-123';
      workflowCoordinationService.handleTaskCompletion.mockResolvedValue();

      await service.handleTaskCompletion(taskId);

      expect(
        workflowCoordinationService.handleTaskCompletion,
      ).toHaveBeenCalledWith(taskId);
    });

    it('should handle task completion without workflow', async () => {
      const taskId = 'task-123';
      workflowCoordinationService.handleTaskCompletion.mockResolvedValue();

      await service.handleTaskCompletion(taskId);

      expect(
        workflowCoordinationService.handleTaskCompletion,
      ).toHaveBeenCalledWith(taskId);
    });

    it('should handle failed task completion', async () => {
      const taskId = 'task-123';
      workflowCoordinationService.handleTaskCompletion.mockResolvedValue();

      await service.handleTaskCompletion(taskId);

      expect(
        workflowCoordinationService.handleTaskCompletion,
      ).toHaveBeenCalledWith(taskId);
    });

    it('should handle task completion without transition', async () => {
      const taskId = 'task-123';
      workflowCoordinationService.handleTaskCompletion.mockResolvedValue();

      await service.handleTaskCompletion(taskId);

      expect(
        workflowCoordinationService.handleTaskCompletion,
      ).toHaveBeenCalledWith(taskId);
    });

    it('should throw NotFoundException when task not found', async () => {
      const taskId = 'non-existent-task';
      workflowCoordinationService.handleTaskCompletion.mockRejectedValue(
        new NotFoundException('Task not found'),
      );

      await expect(service.handleTaskCompletion(taskId)).rejects.toThrow(
        NotFoundException,
      );

      expect(
        workflowCoordinationService.handleTaskCompletion,
      ).toHaveBeenCalledWith(taskId);
    });

    it('should handle task completion error', async () => {
      const taskId = 'task-123';
      const error = new Error('Task completion failed');
      workflowCoordinationService.handleTaskCompletion.mockRejectedValue(error);

      await expect(service.handleTaskCompletion(taskId)).rejects.toThrow(
        'Task completion failed',
      );

      expect(
        workflowCoordinationService.handleTaskCompletion,
      ).toHaveBeenCalledWith(taskId);
    });
  });

  describe('handleTaskFailure', () => {
    it('should handle task failure with workflow', async () => {
      const taskId = 'task-123';
      const error = new Error('Task failed');
      workflowCoordinationService.handleTaskFailure.mockResolvedValue();

      await service.handleTaskFailure(taskId, error);

      expect(
        workflowCoordinationService.handleTaskFailure,
      ).toHaveBeenCalledWith(taskId, error);
    });

    it('should handle task failure without workflow', async () => {
      const taskId = 'task-123';
      const error = new Error('Task failed');
      workflowCoordinationService.handleTaskFailure.mockResolvedValue();

      await service.handleTaskFailure(taskId, error);

      expect(
        workflowCoordinationService.handleTaskFailure,
      ).toHaveBeenCalledWith(taskId, error);
    });

    it('should throw NotFoundException when task not found', async () => {
      const taskId = 'non-existent-task';
      const error = new Error('Task failed');
      workflowCoordinationService.handleTaskFailure.mockRejectedValue(
        new NotFoundException('Task not found'),
      );

      await expect(service.handleTaskFailure(taskId, error)).rejects.toThrow(
        NotFoundException,
      );

      expect(
        workflowCoordinationService.handleTaskFailure,
      ).toHaveBeenCalledWith(taskId, error);
    });

    it('should handle coordinator error', async () => {
      const taskId = 'task-123';
      const error = new Error('Task failed');
      const coordinatorError = new Error('Coordinator failed');
      workflowCoordinationService.handleTaskFailure.mockRejectedValue(
        coordinatorError,
      );

      await expect(service.handleTaskFailure(taskId, error)).rejects.toThrow(
        'Coordinator failed',
      );

      expect(
        workflowCoordinationService.handleTaskFailure,
      ).toHaveBeenCalledWith(taskId, error);
    });
  });
});
