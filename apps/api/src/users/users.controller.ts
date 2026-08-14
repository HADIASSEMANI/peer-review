import { Body, Controller, Delete, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role, type PublicUser } from '@repo/types';
import { CurrentUser, type RequestUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('students')
  @Roles(Role.INSTRUCTOR)
  @ApiOperation({ summary: 'List students (instructor only)' })
  findStudents(
    @CurrentUser() user: RequestUser,
    @Query('search') search?: string,
    @Query('organizationId') organizationId?: string,
    @Query('scope') scope?: 'mine' | 'all',
  ): Promise<PublicUser[]> {
    return this.users.findStudents(user.id, search, organizationId, scope ?? 'all');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Fetch a single user profile' })
  findOne(@Param('id') id: string): Promise<PublicUser> {
    return this.users.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.INSTRUCTOR)
  @ApiOperation({ summary: 'Update a user (instructor only)' })
  update(@Param('id') id: string, @Body() body: any): Promise<PublicUser> {
    return this.users.update(id, body);
  }

  @Delete(':id')
  @Roles(Role.INSTRUCTOR)
  @ApiOperation({ summary: 'Delete a user (instructor only)' })
  remove(@Param('id') id: string): Promise<{ id: string }> {
    return this.users.remove(id);
  }
}
