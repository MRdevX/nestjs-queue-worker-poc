import { Test, TestingModule } from '@nestjs/testing';
import { MessagingService } from '@root/app/core/messaging/messaging.service';
import { TaskService } from '@root/app/task/task.service';
import { CoordinatorService } from '../coordinator.service';

describe('CoordinatorService', () => {
  let service: CoordinatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoordinatorService,
        { provide: MessagingService, useValue: {} },
        { provide: TaskService, useValue: {} },
      ],
    }).compile();

    service = module.get<CoordinatorService>(CoordinatorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
