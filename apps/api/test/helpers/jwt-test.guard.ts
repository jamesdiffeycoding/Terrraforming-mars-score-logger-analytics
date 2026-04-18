import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../src/database/prisma.service';

/**
 * Replaces JwtAuthGuard in integration tests.
 * Accepts Bearer tokens of the form "test:<userId>" and resolves them to DB users.
 */
@Injectable()
export class JwtTestGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const auth: string = req.headers.authorization ?? '';
    if (!auth.startsWith('Bearer test:')) throw new UnauthorizedException();

    const userId = auth.slice('Bearer test:'.length);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    req.user = user;
    return true;
  }
}
