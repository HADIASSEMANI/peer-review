import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  Role,
  type EvaluationTarget,
  type MyFeedback,
  type TeamSummary,
} from '@repo/types';
import { CurrentUser, type RequestUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { SubmitEvaluationBatchDto } from './dto';
import { EvaluationsService } from './evaluations.service';

@ApiTags('evaluations')
@Controller('evaluations')
export class EvaluationsController {
  constructor(private readonly evaluations: EvaluationsService) {}

  @Get('targets')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Teammates the current student can evaluate, with submission state' })
  targets(
    @Query('teamId') teamId: string,
    @CurrentUser() user: RequestUser,
  ): Promise<EvaluationTarget[]> {
    return this.evaluations.targetsForStudent(teamId, user.id);
  }

  @Post()
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Submit or revise evaluations for a whole team in one request' })
  submit(
    @Body() dto: SubmitEvaluationBatchDto,
    @CurrentUser() user: RequestUser,
  ): Promise<{ saved: number }> {
    return this.evaluations.submitBatch(dto, user.id);
  }

  @Get('me')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Anonymous scores and comments received by the current student' })
  me(@CurrentUser() user: RequestUser, @Query('teamId') teamId?: string): Promise<MyFeedback> {
    return this.evaluations.myFeedback(user.id, teamId);
  }

  @Get('summary/team/:teamId')
  @Roles(Role.INSTRUCTOR)
  @ApiOperation({ summary: 'Aggregated results for one team (instructor only)' })
  teamSummary(
    @Param('teamId') teamId: string,
    @CurrentUser() user: RequestUser,
  ): Promise<TeamSummary> {
    return this.evaluations.teamSummary(teamId, user.id);
  }

  @Get('summary/course/:courseId')
  @Roles(Role.INSTRUCTOR)
  @ApiOperation({ summary: 'Aggregated results for every team in a course' })
  courseSummary(
    @Param('courseId') courseId: string,
    @CurrentUser() user: RequestUser,
  ): Promise<TeamSummary[]> {
    return this.evaluations.courseSummary(courseId, user.id);
  }
}
