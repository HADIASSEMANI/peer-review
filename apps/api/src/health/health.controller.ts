import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Render polls this to decide whether a deploy succeeded and whether the
   * instance is still alive. It touches the database on purpose: a process
   * that is up but cannot reach Postgres is not healthy, and reporting it as
   * healthy would mask a broken release.
   */
  @Public()
  @Get()
  @ApiOperation({ summary: 'Liveness and database connectivity probe' })
  async check(): Promise<{ status: string; database: string; uptime: number }> {
    let database = 'up';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      database = 'down';
    }
    return { status: database === 'up' ? 'ok' : 'degraded', database, uptime: process.uptime() };
  }
}
