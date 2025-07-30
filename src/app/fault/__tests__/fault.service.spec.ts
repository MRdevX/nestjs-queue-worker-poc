import { Test, TestingModule } from '@nestjs/testing';
import { MessagingService } from '@root/app/core/messaging/messaging.service';
import { TaskService } from '@root/app/task/task.service';
import { FaultService } from '../fault.service';

describe('FaultService', () => {
  let service: FaultService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FaultService,
        { provide: MessagingService, useValue: {} },
        { provide: TaskService, useValue: {} },
      ],
    }).compile();

    service = module.get<FaultService>(FaultService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
