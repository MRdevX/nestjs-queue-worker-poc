import { Injectable, Logger } from '@nestjs/common';
import { OnModuleInit } from '@nestjs/common';
import { DatabaseSeeder } from './database.seeder';

@Injectable()
export class SeederService implements OnModuleInit {
  private readonly logger = new Logger(SeederService.name);

  constructor(private readonly databaseSeeder: DatabaseSeeder) {}

  async onModuleInit() {
    // Auto-seed database on application startup if needed
    // You can control this with environment variables
    const shouldAutoSeed = process.env.AUTO_SEED_DATABASE === 'true';

    if (shouldAutoSeed) {
      this.logger.log('🚀 Auto-seeding database on startup...');
      try {
        await this.databaseSeeder.seed();
        this.logger.log('✅ Auto-seeding completed successfully');
      } catch (error) {
        this.logger.error('❌ Auto-seeding failed:', error);
      }
    } else {
      this.logger.log(
        '⏭️ Auto-seeding disabled. Use AUTO_SEED_DATABASE=true to enable',
      );
    }
  }

  async seedDatabase(): Promise<void> {
    return this.databaseSeeder.seed();
  }

  async clearDatabase(): Promise<void> {
    return this.databaseSeeder.clear();
  }

  async resetDatabase(): Promise<void> {
    await this.databaseSeeder.clear();
    return this.databaseSeeder.seed();
  }
}
