import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  EVAL_DIMENSIONS,
  Role,
  type Comments,
  type EvaluationTarget,
  type MyFeedback,
  type StudentSummary,
  type TeamSummary,
} from '@repo/types';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  anonymiseComments,
  averageDimensions,
  COMMENT_COLUMN,
  EMPTY_AVERAGE,
  expectedEvaluationCount,
  overallScore,
  type CommentRow,
  type RatingRow,
} from './aggregate';
import type { SubmitEvaluationBatchDto } from './dto';

@Injectable()
export class EvaluationsService {
  constructor(private readonly prisma: PrismaService) {}

  /* ---------------------------------------------------------------------- */
  /* Student: who do I still need to evaluate?                               */
  /* ---------------------------------------------------------------------- */

  async targetsForStudent(teamId: string, studentId: string): Promise<EvaluationTarget[]> {
    const team = await this.requireMembership(teamId, studentId);

    const submitted = await this.prisma.evaluation.findMany({
      where: { teamId, reviewerId: studentId },
    });
    const byReviewee = new Map(submitted.map((e) => [e.revieweeId, e]));

    return team.members
      .filter((m) => m.userId !== studentId) // never evaluate yourself
      .map((m) => {
        const existing = byReviewee.get(m.userId);
        return {
          user: AuthService.toPublicUser(m.user),
          submitted: Boolean(existing),
          existing: existing
            ? {
                cooperation: existing.cooperation,
                conceptualContribution: existing.conceptualContribution,
                practicalContribution: existing.practicalContribution,
                workEthic: existing.workEthic,
              }
            : null,
          existingComments: existing
            ? (Object.fromEntries(
                EVAL_DIMENSIONS.map((d) => [d, existing[COMMENT_COLUMN[d]] ?? undefined]),
              ) as Comments)
            : null,
          submittedAt: existing?.updatedAt.toISOString() ?? null,
        };
      });
  }

  /* ---------------------------------------------------------------------- */
  /* Student: submit the form                                                */
  /* ---------------------------------------------------------------------- */

  async submitBatch(
    dto: SubmitEvaluationBatchDto,
    reviewerId: string,
  ): Promise<{ saved: number }> {
    const team = await this.requireMembership(dto.teamId, reviewerId);
    const memberIds = new Set(team.members.map((m) => m.userId));

    for (const entry of dto.evaluations) {
      if (entry.revieweeId === reviewerId) {
        throw new BadRequestException('You cannot evaluate yourself');
      }
      if (!memberIds.has(entry.revieweeId)) {
        throw new BadRequestException('One or more reviewees are not on this team');
      }
    }

    const seen = new Set<string>();
    for (const entry of dto.evaluations) {
      if (seen.has(entry.revieweeId)) {
        throw new BadRequestException('Duplicate evaluation for the same teammate');
      }
      seen.add(entry.revieweeId);
    }

    // Upsert so a student can revise their submission before the deadline.
    const writes = dto.evaluations.map((entry) => {
      const commentColumns = Object.fromEntries(
        EVAL_DIMENSIONS.map((d) => [COMMENT_COLUMN[d], entry.comments?.[d]?.trim() || null]),
      );
      return this.prisma.evaluation.upsert({
        where: {
          teamId_reviewerId_revieweeId: {
            teamId: dto.teamId,
            reviewerId,
            revieweeId: entry.revieweeId,
          },
        },
        create: {
          teamId: dto.teamId,
          reviewerId,
          revieweeId: entry.revieweeId,
          ...entry.ratings,
          ...commentColumns,
        },
        update: { ...entry.ratings, ...commentColumns },
      });
    });

    const results = await this.prisma.$transaction(writes);
    return { saved: results.length };
  }

  /* ---------------------------------------------------------------------- */
  /* Student: my own anonymised feedback                                     */
  /* ---------------------------------------------------------------------- */

  async myFeedback(studentId: string, teamId?: string): Promise<MyFeedback> {
    const received = await this.prisma.evaluation.findMany({
      where: { revieweeId: studentId, ...(teamId ? { teamId } : {}) },
      // Deliberately no reviewer relation: nothing that could identify authors
      // is loaded, so it cannot leak through a future serialisation change.
      select: {
        cooperation: true,
        conceptualContribution: true,
        practicalContribution: true,
        workEthic: true,
        cooperationComment: true,
        conceptualContributionComment: true,
        practicalContributionComment: true,
        workEthicComment: true,
      },
    });

    const averages = averageDimensions(received);
    return {
      averages,
      overall: overallScore(averages),
      reviewCount: received.length,
      comments: anonymiseComments(received),
    };
  }

  /* ---------------------------------------------------------------------- */
  /* Instructor: aggregates                                                  */
  /* ---------------------------------------------------------------------- */

  async teamSummary(teamId: string, instructorId: string): Promise<TeamSummary> {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: { course: true, members: { include: { user: true } } },
    });
    if (!team) throw new NotFoundException('Team not found');
    if (team.course.instructorId !== instructorId) {
      throw new ForbiddenException('You do not own this course');
    }

    const evaluations = await this.prisma.evaluation.findMany({ where: { teamId } });
    const byReviewee = new Map<string, typeof evaluations>();
    for (const e of evaluations) {
      const bucket = byReviewee.get(e.revieweeId) ?? [];
      bucket.push(e);
      byReviewee.set(e.revieweeId, bucket);
    }

    const students: StudentSummary[] = team.members.map((m) => {
      const rows = byReviewee.get(m.userId) ?? [];
      const averages = averageDimensions(rows as RatingRow[]);
      return {
        user: AuthService.toPublicUser(m.user),
        teamId: team.id,
        teamName: team.name,
        averages,
        overall: overallScore(averages),
        reviewCount: rows.length,
        comments: anonymiseComments(rows as CommentRow[]),
      };
    });

    const teamAverages =
      evaluations.length > 0 ? averageDimensions(evaluations as RatingRow[]) : { ...EMPTY_AVERAGE };
    const expected = expectedEvaluationCount(team.members.length);

    return {
      teamId: team.id,
      teamName: team.name,
      courseCode: team.course.code,
      memberCount: team.members.length,
      maxSize: team.maxSize,
      submittedCount: evaluations.length,
      expectedCount: expected,
      completionRate: expected === 0 ? 0 : Math.round((evaluations.length / expected) * 100) / 100,
      averages: teamAverages,
      overall: overallScore(teamAverages),
      students: students.sort((a, b) => b.overall - a.overall),
    };
  }

  async courseSummary(courseId: string, instructorId: string): Promise<TeamSummary[]> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: { teams: { select: { id: true } } },
    });
    if (!course) throw new NotFoundException('Course not found');
    if (course.instructorId !== instructorId) {
      throw new ForbiddenException('You do not own this course');
    }
    return Promise.all(course.teams.map((t) => this.teamSummary(t.id, instructorId)));
  }

  /* ---------------------------------------------------------------------- */

  private async requireMembership(teamId: string, userId: string) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: { members: { include: { user: true }, orderBy: { joinedAt: 'asc' } } },
    });
    if (!team) throw new NotFoundException('Team not found');
    if (!team.members.some((m) => m.userId === userId)) {
      throw new ForbiddenException('You are not a member of this team');
    }
    return team;
  }
}
