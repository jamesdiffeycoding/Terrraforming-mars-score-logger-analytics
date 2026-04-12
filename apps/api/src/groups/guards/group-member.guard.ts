import { Injectable, CanActivate, ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../database/prisma.service';
import { ROLES_KEY, GroupRole } from '../decorators/roles.decorator';

const ROLE_RANK: Record<string, number> = {
  owner: 4,
  admin: 3,
  member: 2,
  viewer: 1,
};

@Injectable()
export class GroupMemberGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    const groupId = request.params.groupId ?? request.params.id;

    const group = await this.prisma.group.findFirst({
      where: { id: groupId, deletedAt: null },
    });
    if (!group) throw new NotFoundException('Group not found');

    const membership = await this.prisma.groupMember.findFirst({
      where: { groupId, userId: user.id, status: 'active' },
      include: { role: true },
    });
    if (!membership) throw new ForbiddenException('Not a member of this group');

    // Attach membership to request for use in controllers/services
    request.groupMembership = membership;

    const requiredRoles = this.reflector.getAllAndOverride<GroupRole[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const memberRank = ROLE_RANK[membership.role.name] ?? 0;
    const requiredRank = Math.min(...requiredRoles.map((r) => ROLE_RANK[r] ?? 99));

    if (memberRank < requiredRank) throw new ForbiddenException('Insufficient role');
    return true;
  }
}
