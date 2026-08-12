import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role, type Team } from '@repo/types';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateTeamDto, UpdateTeamDto } from './dto';

const teamInclude = {
  course: true,
  members: { include: { user: true }, orderBy: { joinedAt: 'asc' } },
} as const;

type TeamRow = {
  id: string;
  name: string;
  courseId: string;
  createdAt: Date;
  course?: { id: string; code: string; title: string; term: string; instructorId: string; createdAt: Date } | null;
  members?: Array<{
    id: string;
    userId: string;
    teamId: string;
    joinedAt: Date;
    user: Parameters<typeof AuthService.toPublicUser>[0];
  }>;
};

function toTeam(t: TeamRow): Team {
  return {
    id: t.id,
    name: t.name,
    courseId: t.courseId,
    createdAt: t.createdAt.toISOString(),
    course: t.course
      ? {
          id: t.course.id,
          code: t.course.code,
          title: t.course.title,
          term: t.course.term,
          instructorId: t.course.instructorId,
          createdAt: t.course.createdAt.toISOString(),
        }
      : undefined,
    members: (t.members ?? []).map((m) => ({
      id: m.id,
      userId: m.userId,
      teamId: m.teamId,
      joinedAt: m.joinedAt.toISOString(),
      user: AuthService.toPublicUser(m.user),
    })),
  };
}

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(instructorId: string, dto: CreateTeamDto): Promise<Team> {
    const course = await this.prisma.course.findUnique({ where: { id: dto.courseId } });
    if (!course) throw new NotFoundException('Course not found');
    if (course.instructorId !== instructorId) {
      throw new ForbiddenException('You do not own this course');
    }

    const duplicate = await this.prisma.team.findUnique({
      where: { courseId_name: { courseId: dto.courseId, name: dto.name } },
    });
    if (duplicate) throw new ConflictException(`"${dto.name}" already exists in this course`);

    await this.assertAllAreStudents(dto.memberIds);

    const team = await this.prisma.team.create({
      data: {
        name: dto.name,
        courseId: dto.courseId,
        members: { create: dto.memberIds.map((userId) => ({ userId })) },
      },
      include: teamInclude,
    });
    return toTeam(team);
  }

  async findAllForUser(userId: string, role: string, courseId?: string): Promise<Team[]> {
    const teams = await this.prisma.team.findMany({
      where: {
        ...(courseId ? { courseId } : {}),
        ...(role === Role.INSTRUCTOR
          ? { course: { instructorId: userId } }
          : { members: { some: { userId } } }),
      },
      include: teamInclude,
      orderBy: { name: 'asc' },
    });
    return teams.map(toTeam);
  }

  async findOne(id: string, userId: string, role: string): Promise<Team> {
    const team = await this.prisma.team.findUnique({ where: { id }, include: teamInclude });
    if (!team) throw new NotFoundException('Team not found');

    const isInstructor = role === Role.INSTRUCTOR && team.course.instructorId === userId;
    const isMember = team.members.some((m) => m.userId === userId);
    if (!isInstructor && !isMember) throw new ForbiddenException('You are not on this team');

    return toTeam(team);
  }

  async update(id: string, instructorId: string, dto: UpdateTeamDto): Promise<Team> {
    await this.assertInstructorOwnsTeam(id, instructorId);
    if (dto.memberIds) await this.assertAllAreStudents(dto.memberIds);

    const team = await this.prisma.team.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        // Replacing the roster wholesale keeps the client simple; evaluations
        // referencing a removed member cascade away with the TeamMember row.
        ...(dto.memberIds
          ? { members: { deleteMany: {}, create: dto.memberIds.map((userId) => ({ userId })) } }
          : {}),
      },
      include: teamInclude,
    });
    return toTeam(team);
  }

  async remove(id: string, instructorId: string): Promise<{ id: string }> {
    await this.assertInstructorOwnsTeam(id, instructorId);
    await this.prisma.team.delete({ where: { id } });
    return { id };
  }

  private async assertInstructorOwnsTeam(teamId: string, instructorId: string): Promise<void> {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: { course: true },
    });
    if (!team) throw new NotFoundException('Team not found');
    if (team.course.instructorId !== instructorId) {
      throw new ForbiddenException('You do not own this course');
    }
  }

  private async assertAllAreStudents(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const unique = [...new Set(ids)];
    if (unique.length !== ids.length) throw new BadRequestException('Duplicate members in roster');

    const found = await this.prisma.user.findMany({
      where: { id: { in: unique } },
      select: { id: true, role: true },
    });
    if (found.length !== unique.length) throw new BadRequestException('One or more users not found');
    if (found.some((u) => u.role !== Role.STUDENT)) {
      throw new BadRequestException('Only students can be added to a team');
    }
  }
}
