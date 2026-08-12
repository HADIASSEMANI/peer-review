import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@repo/db';

/**
 * Thin Nest wrapper around the shared PrismaClient so services can inject it
 * and Nest owns the connection lifecycle.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log(`Connected to database (provider: ${process.env.DATABASE_PROVIDER ?? 'sqlite'})`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
