import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Role } from '@repo/types';

export interface RequestUser {
  id: string;
  email: string;
  role: Role;
}

/** Injects the authenticated user attached by JwtStrategy.validate(). */
export const CurrentUser = createParamDecorator(
  (data: keyof RequestUser | undefined, ctx: ExecutionContext) => {
    const user = ctx.switchToHttp().getRequest<{ user: RequestUser }>().user;
    return data ? user?.[data] : user;
  },
);
