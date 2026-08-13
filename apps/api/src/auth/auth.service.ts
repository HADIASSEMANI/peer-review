import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import type { AuthResponse, JwtPayload, PublicUser, Role } from '@repo/types';
import { PrismaService } from '../prisma/prisma.service';
import type { LoginDto, RegisterDto } from './dto';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('An account with that email already exists');

    if (dto.studentId) {
      const dupe = await this.prisma.user.findUnique({ where: { studentId: dto.studentId } });
      if (dupe) throw new ConflictException('That student ID is already registered');
    }

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        password: await bcrypt.hash(dto.password, SALT_ROUNDS),
        firstName: dto.firstName,
        lastName: dto.lastName,
        studentId: dto.studentId ?? null,
        organizationId: dto.organizationId ?? 'org1',
        role: dto.role,
      },
    });

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    // Same message for unknown email and bad password — no account enumeration.
    if (!user) throw new UnauthorizedException('Invalid email or password');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid email or password');

    return this.buildAuthResponse(user);
  }

  async me(userId: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Account no longer exists');
    return AuthService.toPublicUser(user);
  }

  private async buildAuthResponse(user: {
    id: string;
    email: string;
    role: string;
    firstName: string;
    lastName: string;
    studentId: string | null;
    createdAt: Date;
  }): Promise<AuthResponse> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role as Role,
    };
    return {
      accessToken: await this.jwt.signAsync(payload),
      user: AuthService.toPublicUser(user),
    };
  }

  /** Strips the password hash — never let a User row reach the wire raw. */
  static toPublicUser(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    studentId: string | null;
    role: string;
    organizationId?: string;
    createdAt: Date;
  }): PublicUser {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      studentId: user.studentId,
      role: user.role as Role,
      organizationId: user.organizationId ?? 'org1',
      createdAt: user.createdAt.toISOString(),
    };
  }
}
