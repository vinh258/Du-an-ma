import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Role } from './enums';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export const OPTIONAL_AUTH_KEY = 'optionalAuth';
/** Route công khai nhưng nếu có token hợp lệ thì vẫn gắn user vào request */
export const OptionalAuth = () => SetMetadata(OPTIONAL_AUTH_KEY, true);

export interface AuthUser { id: number; role: Role; email: string; fullName: string }

export const CurrentUser = createParamDecorator((field: keyof AuthUser | undefined, ctx: ExecutionContext) => {
  const user: AuthUser | undefined = ctx.switchToHttp().getRequest().user;
  return field ? user?.[field] : user;
});
