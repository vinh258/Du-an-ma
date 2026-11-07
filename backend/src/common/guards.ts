import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../modules/users/entities/user.entity';
import { OPTIONAL_AUTH_KEY, ROLES_KEY } from './decorators';
import { Role } from './enums';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const optional = this.reflector.getAllAndOverride<boolean>(OPTIONAL_AUTH_KEY, [ctx.getHandler(), ctx.getClass()]);
    const header: string = req.headers['authorization'] || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      if (optional) return true;
      throw new UnauthorizedException('Bạn cần đăng nhập');
    }
    try {
      const payload = await this.jwt.verifyAsync(token);
      const user = await this.users.findOne({ where: { id: payload.sub } });
      if (!user) throw new UnauthorizedException('Tài khoản không tồn tại');
      if (user.status === 'BANNED') throw new ForbiddenException('Tài khoản đã bị khóa');
      req.user = { id: user.id, role: user.role, email: user.email, fullName: user.fullName };
      return true;
    } catch (e) {
      if (e instanceof ForbiddenException) throw e;
      if (optional) return true;
      throw new UnauthorizedException('Phiên đăng nhập không hợp lệ hoặc đã hết hạn');
    }
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (!required?.length) return true;
    const user = ctx.switchToHttp().getRequest().user;
    if (!user || !required.includes(user.role)) throw new ForbiddenException('Bạn không có quyền thực hiện thao tác này');
    return true;
  }
}
