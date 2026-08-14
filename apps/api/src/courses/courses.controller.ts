import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role, type Course, type CourseDeleteImpact } from '@repo/types';
import { CurrentUser, type RequestUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { CoursesService } from './courses.service';
import { CreateCourseDto, UpdateCourseDto } from './dto';

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

  @Get('organizations')
  @ApiOperation({ summary: 'List all organizations' })
  listOrganizations(): Promise<Array<{ id: string; name: string }>> {
    return this.courses.listOrganizations();
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

  // Declared before the mutating routes purely for readability; Nest matches on
  // the full path so ':id/impact' can never be shadowed by ':id'.
  @Get(':id/impact')
  @Roles(Role.INSTRUCTOR)
  @ApiOperation({ summary: 'Count what deleting this course would cascade away' })
  deleteImpact(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ): Promise<CourseDeleteImpact> {
    return this.courses.deleteImpact(id, user.id);
  }

  @Patch(':id')
  @Roles(Role.INSTRUCTOR)
  @ApiOperation({ summary: 'Edit a course you own' })
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateCourseDto,
  ): Promise<Course> {
    return this.courses.update(id, user.id, dto);
  }

  @Delete(':id')
  @Roles(Role.INSTRUCTOR)
  @ApiOperation({ summary: 'Delete a course you own, and everything under it' })
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<{ id: string }> {
    return this.courses.remove(id, user.id);
  }
}
