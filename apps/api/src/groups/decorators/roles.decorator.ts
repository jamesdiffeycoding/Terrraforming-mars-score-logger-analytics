import { SetMetadata } from '@nestjs/common';

export type GroupRole = 'owner' | 'admin' | 'member' | 'viewer';

export const ROLES_KEY = 'groupRoles';
export const Roles = (...roles: GroupRole[]) => SetMetadata(ROLES_KEY, roles);
