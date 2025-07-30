import { Test, TestingModule } from '@nestjs/testing';
import { BaseRepositoryMockFactory } from '@test/mocks';
import { TaskService } from '../task.service';
import { TaskRepository } from '../task.repository';
import { TaskLogRepository } from '../task-log.repository';

describe('TaskService', () => {
  let service: TaskService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskService,
        {
          provide: TaskRepository,
          useValue: BaseRepositoryMockFactory.createWithDefaults(),
        },
        {
          provide: TaskLogRepository,
          useValue: BaseRepositoryMockFactory.createWithDefaults(),
        },
      ],
    }).compile();

    service = module.get<TaskService>(TaskService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
