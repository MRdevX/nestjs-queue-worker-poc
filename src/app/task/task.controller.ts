import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { TaskType } from './types/task-type.enum';
import { TaskService } from './task.service';

@Controller('tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  async createTask(@Body() body: { type: TaskType; payload: any }) {
    return this.taskService.createTask(body.type, body.payload);
  }

  @Get(':id')
  async getTask(@Param('id') id: string) {
    return this.taskService.getTaskById(id, {
      relations: ['logs', 'children'],
    });
  }
}
