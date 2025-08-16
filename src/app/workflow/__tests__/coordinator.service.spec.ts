import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { WorkflowEntityMockFactory } from '@test/mocks';
import { TaskEntityMockFactory } from '@test/mocks';
import { CoordinatorService } from '../coordinator.service';
import { TaskService } from '../../task/task.service';
import { MessagingService } from '../../core/messaging/services/messaging.service';
import { WorkflowService } from '../workflow.service';
import { TaskType } from '../../task/types/task-type.enum';
import { TaskStatus } from '../../task/types/task-status.enum';

describe('CoordinatorService', () => {
  let service: CoordinatorService;
  let taskService: jest.Mocked<TaskService>;
  let messagingService: jest.Mocked<MessagingService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoordinatorService,
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

      const mockTask = TaskEntityMockFactory.create({
        type: TaskType.HTTP_REQUEST,
        payload: { url: 'https://api.example.com' },
      });

      taskService.createTask.mockResolvedValue(mockTask as any);
      messagingService.publishTask.mockResolvedValue();

      await service.startWorkflow(workflow as any);

      expect(taskService.createTask).toHaveBeenCalledWith(
        TaskType.HTTP_REQUEST,
        { url: 'https://api.example.com' },
        workflow.id,
      );
      expect(messagingService.publishTask).toHaveBeenCalledWith(
        mockTask.type,
        mockTask.id,
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

      const error = new Error('Task creation failed');
      taskService.createTask.mockRejectedValue(error);

      await expect(service.startWorkflow(workflow as any)).rejects.toThrow(
        'Task creation failed',
      );

      expect(taskService.createTask).toHaveBeenCalledWith(
        TaskType.HTTP_REQUEST,
        { url: 'https://api.example.com' },
        workflow.id,
      );
      expect(messagingService.publishTask).not.toHaveBeenCalled();
    });
  });

  describe('handleTaskCompletion', () => {
    it('should handle task completion with next transition', async () => {
      const taskId = 'task-123';
      const workflow = WorkflowEntityMockFactory.create({
        definition: {
          initialTask: { type: TaskType.HTTP_REQUEST, payload: {} },
          transitions: {
            [TaskType.HTTP_REQUEST]: {
              type: TaskType.DATA_PROCESSING,
              payload: { source: 'api' },
            },
          },
        },
      });

      const task = TaskEntityMockFactory.create({
        id: taskId,
        type: TaskType.HTTP_REQUEST,
        status: TaskStatus.COMPLETED,
        workflow,
      });

      const nextTask = TaskEntityMockFactory.create({
        type: TaskType.DATA_PROCESSING,
        payload: { source: 'api' },
      });

      taskService.getTaskByIdWithWorkflow.mockResolvedValue(task as any);
      taskService.createTask.mockResolvedValue(nextTask as any);
      messagingService.publishTask.mockResolvedValue();

      await service.handleTaskCompletion(taskId);

      expect(taskService.getTaskByIdWithWorkflow).toHaveBeenCalledWith(taskId);
      expect(taskService.createTask).toHaveBeenCalledWith(
        TaskType.DATA_PROCESSING,
        { source: 'api' },
        workflow.id,
      );
      expect(messagingService.publishTask).toHaveBeenCalledWith(
        nextTask.type,
        nextTask.id,
      );
    });

    it('should handle task completion without workflow', async () => {
      const taskId = 'task-123';
      const task = TaskEntityMockFactory.create({
        id: taskId,
        workflow: null,
      });

      taskService.getTaskByIdWithWorkflow.mockResolvedValue(task as any);

      await service.handleTaskCompletion(taskId);

      expect(taskService.getTaskByIdWithWorkflow).toHaveBeenCalledWith(taskId);
      expect(taskService.createTask).not.toHaveBeenCalled();
      expect(messagingService.publishTask).not.toHaveBeenCalled();
    });

    it('should handle failed task completion', async () => {
      const taskId = 'task-123';
      const workflow = WorkflowEntityMockFactory.create();

      const task = TaskEntityMockFactory.create({
        id: taskId,
        status: TaskStatus.FAILED,
        workflow,
      });

      taskService.getTaskByIdWithWorkflow.mockResolvedValue(task as any);

      await service.handleTaskCompletion(taskId);

      expect(taskService.getTaskByIdWithWorkflow).toHaveBeenCalledWith(taskId);
      expect(taskService.createTask).not.toHaveBeenCalled();
      expect(messagingService.publishTask).not.toHaveBeenCalled();
    });

    it('should handle task completion without transition', async () => {
      const taskId = 'task-123';
      const workflow = WorkflowEntityMockFactory.create({
        definition: {
          initialTask: { type: TaskType.HTTP_REQUEST, payload: {} },
          transitions: {},
        },
      });

      const task = TaskEntityMockFactory.create({
        id: taskId,
        type: TaskType.HTTP_REQUEST,
        status: TaskStatus.COMPLETED,
        workflow,
      });

      taskService.getTaskByIdWithWorkflow.mockResolvedValue(task as any);

      await service.handleTaskCompletion(taskId);

      expect(taskService.getTaskByIdWithWorkflow).toHaveBeenCalledWith(taskId);
      expect(taskService.createTask).not.toHaveBeenCalled();
      expect(messagingService.publishTask).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when task not found', async () => {
      const taskId = 'non-existent-task';

      taskService.getTaskByIdWithWorkflow.mockResolvedValue(null);

      await expect(service.handleTaskCompletion(taskId)).rejects.toThrow(
        NotFoundException,
      );

      expect(taskService.getTaskByIdWithWorkflow).toHaveBeenCalledWith(taskId);
      expect(taskService.createTask).not.toHaveBeenCalled();
      expect(messagingService.publishTask).not.toHaveBeenCalled();
    });

    it('should handle task completion error', async () => {
      const taskId = 'task-123';
      const error = new Error('Database error');

      taskService.getTaskByIdWithWorkflow.mockRejectedValue(error);

      await expect(service.handleTaskCompletion(taskId)).rejects.toThrow(
        'Database error',
      );

      expect(taskService.getTaskByIdWithWorkflow).toHaveBeenCalledWith(taskId);
      expect(taskService.createTask).not.toHaveBeenCalled();
      expect(messagingService.publishTask).not.toHaveBeenCalled();
    });
  });

  describe('handleTaskFailure', () => {
    it('should handle task failure with workflow', async () => {
      const taskId = 'task-123';
      const error = new Error('Network timeout');
      const workflow = WorkflowEntityMockFactory.create();

      const task = TaskEntityMockFactory.create({
        id: taskId,
        workflow,
      });

      taskService.getTaskByIdWithWorkflow.mockResolvedValue(task as any);

      await service.handleTaskFailure(taskId, error);

      expect(taskService.getTaskByIdWithWorkflow).toHaveBeenCalledWith(taskId);
    });

    it('should handle task failure without workflow', async () => {
      const taskId = 'task-123';
      const error = new Error('Network timeout');

      const task = TaskEntityMockFactory.create({
        id: taskId,
        workflow: null,
      });

      taskService.getTaskByIdWithWorkflow.mockResolvedValue(task as any);

      await service.handleTaskFailure(taskId, error);

      expect(taskService.getTaskByIdWithWorkflow).toHaveBeenCalledWith(taskId);
    });

    it('should throw NotFoundException when task not found', async () => {
      const taskId = 'non-existent-task';
      const error = new Error('Network timeout');

      taskService.getTaskByIdWithWorkflow.mockResolvedValue(null);

      await expect(service.handleTaskFailure(taskId, error)).rejects.toThrow(
        NotFoundException,
      );

      expect(taskService.getTaskByIdWithWorkflow).toHaveBeenCalledWith(taskId);
    });

    it('should handle coordinator error', async () => {
      const taskId = 'task-123';
      const error = new Error('Network timeout');
      const coordinatorError = new Error('Database error');

      taskService.getTaskByIdWithWorkflow.mockRejectedValue(coordinatorError);

      await expect(service.handleTaskFailure(taskId, error)).rejects.toThrow(
        'Database error',
      );

      expect(taskService.getTaskByIdWithWorkflow).toHaveBeenCalledWith(taskId);
    });
  });
});
