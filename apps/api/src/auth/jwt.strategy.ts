import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { JwtPayload } from '@repo/types';
import { PrismaService } from '../prisma/prisma.service';
import type { RequestUser } from '../common/current-user.decorator';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') ?? 'dev-only-change-me-in-production',
    });
  }

  /** Re-reads the user each request so a deleted or demoted account loses access immediately. */
  async validate(payload: JwtPayload): Promise<RequestUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true },
    });
    if (!user) throw new UnauthorizedException('Account no longer exists');
    return { id: user.id, email: user.email, role: user.role as RequestUser['role'] };
  }
}
