import { Module } from '@nestjs/common';
import { FaultService } from './fault.service';

@Module({
  providers: [FaultService]
})
export class FaultModule {}
