import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role, type Team } from '@repo/types';
import { CurrentUser, type RequestUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { CreateTeamDto, UpdateTeamDto } from './dto';
import { TeamsService } from './teams.service';

@ApiTags('teams')
@Controller('teams')
export class TeamsController {
  constructor(private readonly teams: TeamsService) {}

  @Post()
  @Roles(Role.INSTRUCTOR)
  @ApiOperation({ summary: 'Create a team with an initial roster' })
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateTeamDto): Promise<Team> {
    return this.teams.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List teams — owned courses for instructors, memberships for students' })
  findAll(@CurrentUser() user: RequestUser, @Query('courseId') courseId?: string): Promise<Team[]> {
    return this.teams.findAllForUser(user.id, user.role, courseId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Fetch one team with its roster' })
  findOne(@Param('id') id: string, @CurrentUser() user: RequestUser): Promise<Team> {
    return this.teams.findOne(id, user.id, user.role);
  }

  @Patch(':id')
  @Roles(Role.INSTRUCTOR)
  @ApiOperation({ summary: 'Rename a team or replace its roster' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateTeamDto,
  ): Promise<Team> {
    return this.teams.update(id, user.id, dto);
  }

  @Delete(':id')
  @Roles(Role.INSTRUCTOR)
  @ApiOperation({ summary: 'Delete a team and its evaluations' })
  remove(@Param('id') id: string, @CurrentUser() user: RequestUser): Promise<{ id: string }> {
    return this.teams.remove(id, user.id);
  }
}
