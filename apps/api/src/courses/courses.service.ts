import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Course } from '@repo/types';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateCourseDto } from './dto';

type CourseRow = {
  id: string;
  code: string;
  title: string;
  term: string;
  instructorId: string;
  createdAt: Date;
};

const toCourse = (c: CourseRow): Course => ({
  id: c.id,
  code: c.code,
  title: c.title,
  term: c.term,
  instructorId: c.instructorId,
  createdAt: c.createdAt.toISOString(),
});

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(instructorId: string, dto: CreateCourseDto): Promise<Course> {
    const existing = await this.prisma.course.findUnique({
      where: { code_term: { code: dto.code, term: dto.term } },
    });
    if (existing) throw new ConflictException(`${dto.code} already exists for ${dto.term}`);

    const course = await this.prisma.course.create({ data: { ...dto, instructorId } });
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
}
