import { Injectable, Logger } from '@nestjs/common';
import { OnModuleInit } from '@nestjs/common';
import {
  DatabaseSeeder,
  ISeederConfig,
  ISeederResult,
} from './database.seeder';

@Injectable()
export class SeederService implements OnModuleInit {
  private readonly logger = new Logger(SeederService.name);

  constructor(private readonly databaseSeeder: DatabaseSeeder) {}

  async onModuleInit() {
    const shouldAutoSeed = process.env.AUTO_SEED_DATABASE === 'true';

    if (shouldAutoSeed) {
      this.logger.log('🚀 Auto-seeding database on startup...');
      try {
        const result = await this.databaseSeeder.seed();
        this.logger.log('✅ Auto-seeding completed successfully', result);
      } catch (error) {
        this.logger.error('❌ Auto-seeding failed:', error);
      }
    } else {
      this.logger.log(
        '⏭️ Auto-seeding disabled. Use AUTO_SEED_DATABASE=true to enable',
      );
    }
  }

  async seedDatabase(config?: Partial<ISeederConfig>): Promise<ISeederResult> {
    return this.databaseSeeder.seed(config);
  }

  async clearDatabase(): Promise<void> {
    return this.databaseSeeder.clear();
  }

  async resetDatabase(config?: Partial<ISeederConfig>): Promise<ISeederResult> {
    await this.databaseSeeder.clear();
    return this.databaseSeeder.seed(config);
  }
}
