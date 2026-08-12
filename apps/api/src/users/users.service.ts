import { Injectable, NotFoundException } from '@nestjs/common';
import { Role, type PublicUser } from '@repo/types';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /** All students, for the instructor's team-builder picker. */
  async findStudents(search?: string): Promise<PublicUser[]> {
    const term = search?.trim();
    const users = await this.prisma.user.findMany({
      where: {
        role: Role.STUDENT,
        ...(term
          ? {
              OR: [
                { firstName: { contains: term } },
                { lastName: { contains: term } },
                { email: { contains: term } },
                { studentId: { contains: term } },
              ],
            }
          : {}),
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
    return users.map(AuthService.toPublicUser);
  }

  async findOne(id: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return AuthService.toPublicUser(user);
  }

  async remove(id: string): Promise<{ id: string }> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    await this.prisma.user.delete({ where: { id } });
    return { id };
  }

  async update(
    id: string,
    data: { firstName?: string; lastName?: string; email?: string; studentId?: string | null },
  ): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    const updated = await this.prisma.user.update({
      where: { id },
      data,
    });
    return AuthService.toPublicUser(updated);
  }
}
