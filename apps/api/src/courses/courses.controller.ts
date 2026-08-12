import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role, type Course } from '@repo/types';
import { CurrentUser, type RequestUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto';

@ApiTags('courses')
@Controller('courses')
export class CoursesController {
  constructor(private readonly courses: CoursesService) {}

  @Post()
  @Roles(Role.INSTRUCTOR)
  @ApiOperation({ summary: 'Create a course (instructor only)' })
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateCourseDto): Promise<Course> {
    return this.courses.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List courses visible to the current user' })
  findAll(@CurrentUser() user: RequestUser): Promise<Course[]> {
    return this.courses.findForUser(user.id, user.role);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Fetch one course' })
  findOne(@Param('id') id: string): Promise<Course> {
    return this.courses.findOne(id);
  }
}
