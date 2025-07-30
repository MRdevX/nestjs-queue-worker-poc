import { WorkerModule } from '../worker.module';
import { DataWorker } from '../data.worker';
import { HttpWorker } from '../http.worker';
import { CompensationWorker } from '../compensation.worker';

describe('WorkerModule Integration', () => {
  describe('Module Structure', () => {
    it('should be defined', () => {
      expect(WorkerModule).toBeDefined();
    });

    it('should have proper module metadata', () => {
      const moduleMetadata = Reflect.getMetadata('imports', WorkerModule);
      const providers = Reflect.getMetadata('providers', WorkerModule);
      const exports = Reflect.getMetadata('exports', WorkerModule);

      expect(moduleMetadata).toBeDefined();
      expect(providers).toBeDefined();
      expect(exports).toBeDefined();
    });

    it('should export all workers', () => {
      const exports = Reflect.getMetadata('exports', WorkerModule);
      expect(exports).toContain(DataWorker);
      expect(exports).toContain(HttpWorker);
      expect(exports).toContain(CompensationWorker);
    });

    it('should have required providers', () => {
      const providers = Reflect.getMetadata('providers', WorkerModule);
      expect(providers).toContain(DataWorker);
      expect(providers).toContain(HttpWorker);
      expect(providers).toContain(CompensationWorker);
    });
  });
});
