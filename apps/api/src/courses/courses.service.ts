import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Course, CourseDeleteImpact } from '@repo/types';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateCourseDto, UpdateCourseDto } from './dto';

type CourseRow = {
  id: string;
  code: string;
  title: string;
  term: string;
  organizationId: string;
  instructorId: string;
  createdAt: Date;
};

const toCourse = (c: CourseRow): Course => ({
  id: c.id,
  code: c.code,
  title: c.title,
  term: c.term,
  organizationId: c.organizationId,
  instructorId: c.instructorId,
  createdAt: c.createdAt.toISOString(),
});

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lists the schools a selector can offer. */
  async listOrganizations(): Promise<Array<{ id: string; name: string }>> {
    return this.prisma.organization.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  async create(instructorId: string, dto: CreateCourseDto): Promise<Course> {
    const existing = await this.prisma.course.findUnique({
      where: { code_term: { code: dto.code, term: dto.term } },
    });
    if (existing) throw new ConflictException(`${dto.code} already exists for ${dto.term}`);

    // A course belongs to the creating instructor's school unless told otherwise,
    // so the common case needs no extra input in the form.
    const instructor = await this.prisma.user.findUnique({
      where: { id: instructorId },
      select: { organizationId: true },
    });

    const course = await this.prisma.course.create({
      data: {
        ...dto,
        organizationId: dto.organizationId ?? instructor?.organizationId ?? 'org1',
        instructorId,
      },
    });
    return toCourse(course);
  }

  /** Instructors see courses they own; students see courses they have a team in. */
  async findForUser(userId: string, role: string): Promise<Course[]> {
    const courses = await this.prisma.course.findMany({
      where:
        role === 'INSTRUCTOR'
          ? { instructorId: userId }
          : { teams: { some: { members: { some: { userId } } } } },
      orderBy: { createdAt: 'desc' },
    });
    return courses.map(toCourse);
  }

  async findOne(id: string): Promise<Course> {
    const course = await this.prisma.course.findUnique({ where: { id } });
    if (!course) throw new NotFoundException('Course not found');
    return toCourse(course);
  }

  async update(id: string, instructorId: string, dto: UpdateCourseDto): Promise<Course> {
    const existing = await this.assertInstructorOwnsCourse(id, instructorId);

    // (code, term) is uniquely constrained. Only re-check when one of them is
    // actually changing, otherwise editing just the title would collide with
    // the course's own row.
    const code = dto.code ?? existing.code;
    const term = dto.term ?? existing.term;
    if (code !== existing.code || term !== existing.term) {
      const clash = await this.prisma.course.findUnique({
        where: { code_term: { code, term } },
      });
      if (clash && clash.id !== id) {
        throw new ConflictException(`${code} already exists for ${term}`);
      }
    }

    const course = await this.prisma.course.update({
      where: { id },
      data: {
        ...(dto.code ? { code: dto.code } : {}),
        ...(dto.title ? { title: dto.title } : {}),
        ...(dto.term ? { term: dto.term } : {}),
      },
    });
    return toCourse(course);
  }

  /**
   * What `remove` would destroy. Deleting a Course cascades to its Teams, and
   * each Team cascades to its TeamMembers and Evaluations — so the instructor
   * is shown these counts and has to confirm before any of it happens.
   */
  async deleteImpact(id: string, instructorId: string): Promise<CourseDeleteImpact> {
    await this.assertInstructorOwnsCourse(id, instructorId);

    const teams = await this.prisma.team.findMany({
      where: { courseId: id },
      select: { id: true },
    });
    const teamIds = teams.map((t: { id: string }) => t.id);

    const [memberCount, evaluationCount] = await Promise.all([
      this.prisma.teamMember.count({ where: { teamId: { in: teamIds } } }),
      this.prisma.evaluation.count({ where: { teamId: { in: teamIds } } }),
    ]);

    return { teamCount: teams.length, memberCount, evaluationCount };
  }

  async remove(id: string, instructorId: string): Promise<{ id: string }> {
    await this.assertInstructorOwnsCourse(id, instructorId);
    // Teams -> TeamMembers/Evaluations all carry onDelete: Cascade, so this one
    // statement takes the whole subtree with it. Nothing to unwind by hand.
    await this.prisma.course.delete({ where: { id } });
    return { id };
  }

  private async assertInstructorOwnsCourse(id: string, instructorId: string) {
    const course = await this.prisma.course.findUnique({ where: { id } });
    if (!course) throw new NotFoundException('Course not found');
    if (course.instructorId !== instructorId) {
      throw new ForbiddenException('You do not own this course');
    }
    return course;
  }
}
