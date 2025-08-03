import { Controller, Post, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { DatabaseSeeder } from './database.seeder';

@Controller('seeder')
export class SeederController {
  constructor(private readonly databaseSeeder: DatabaseSeeder) {}

  @Post('seed')
  @HttpCode(HttpStatus.OK)
  async seedDatabase() {
    await this.databaseSeeder.seed();
    return {
      message: 'Database seeded successfully',
      timestamp: new Date().toISOString(),
    };
  }

  @Delete('clear')
  @HttpCode(HttpStatus.OK)
  async clearDatabase() {
    await this.databaseSeeder.clear();
    return {
      message: 'Database cleared successfully',
      timestamp: new Date().toISOString(),
    };
  }

  @Post('reset')
  @HttpCode(HttpStatus.OK)
  async resetDatabase() {
    await this.databaseSeeder.clear();
    await this.databaseSeeder.seed();
    return {
      message: 'Database reset successfully',
      timestamp: new Date().toISOString(),
    };
  }
}
