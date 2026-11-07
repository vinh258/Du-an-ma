import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { MailService } from './mail.service';
import { PasswordReset } from './password-reset.entity';
import { Role } from '../../common/enums';
import { User } from '../users/entities/user.entity';
import { LoginDto, RegisterDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(PasswordReset) private readonly resets: Repository<PasswordReset>,
    private readonly mail: MailService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private async issueTokens(user: User) {
    const accessToken = await this.jwt.signAsync({ sub: user.id, role: user.role });
    const refreshToken = await this.jwt.signAsync(
      { sub: user.id, purpose: 'refresh' },
      { secret: this.config.getOrThrow('JWT_REFRESH_SECRET'), expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN') || '7d' },
    );
    return { accessToken, refreshToken };
  }

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase().trim();
    if (await this.users.exist({ where: { email } })) throw new ConflictException('Email đã được sử dụng');
    const user = await this.users.save(this.users.create({
      email, fullName: dto.fullName.trim(), studentCode: dto.studentCode ?? null, facultyId: dto.facultyId ?? null,
      passwordHash: await bcrypt.hash(dto.password, 10), role: Role.STUDENT,
    }));
    return { user: await this.users.findOneByOrFail({ id: user.id }), ...(await this.issueTokens(user)) };
  }

  async login(dto: LoginDto) {
    const user = await this.users.createQueryBuilder('u').addSelect('u.passwordHash')
      .where('u.email = :email', { email: dto.email.toLowerCase().trim() }).getOne();
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash)))
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    if (user.status === 'BANNED') throw new ForbiddenException('Tài khoản đã bị khóa');
    return { user: await this.users.findOneByOrFail({ id: user.id }), ...(await this.issueTokens(user)) };
  }

  async refresh(refreshToken: string) {
    try {
      const p = await this.jwt.verifyAsync(refreshToken, { secret: this.config.getOrThrow('JWT_REFRESH_SECRET') });
      if (p.purpose !== 'refresh') throw new Error();
      const user = await this.users.findOneBy({ id: p.sub });
      if (!user || user.status === 'BANNED') throw new Error();
      return this.issueTokens(user);
    } catch {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');
    }
  }

  // ---------------------------------------------------------- quên / đổi mật khẩu
  /** Luôn trả cùng một thông báo để không lộ email nào đã đăng ký. */
  async forgotPassword(email: string) {
    const message = 'Nếu email tồn tại, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.';
    const user = await this.users.findOneBy({ email: email.toLowerCase().trim() });
    if (!user || user.status === 'BANNED') return { message };

    const token = randomBytes(32).toString('hex');
    await this.resets.save(this.resets.create({
      userId: user.id, tokenHash: createHash('sha256').update(token).digest('hex'),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    }));
    const link = `${this.config.get('FRONTEND_URL') || 'http://localhost:5173'}/reset-password?token=${token}`;

    const sent = await this.mail.send(user.email, 'Đặt lại mật khẩu TVinhhh',
      `<p>Chào ${user.fullName},</p><p>Bấm vào liên kết dưới đây để đặt lại mật khẩu (hiệu lực 30 phút):</p><p><a href="${link}">${link}</a></p><p>Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>`);
    if (sent) return { message };

    // Chưa cấu hình SMTP: in link ra console; chế độ phát triển còn trả link về cho giao diện để demo
    this.logger.warn(`[DEV] Link đặt lại mật khẩu cho ${user.email}: ${link}`);
    const showLink = process.env.NODE_ENV !== 'production' || this.config.get('SHOW_DEV_RESET_LINK') === 'true';
    return showLink ? { message, devResetLink: link } : { message };
  }

  async resetPassword(token: string, password: string) {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const row = await this.resets.findOneBy({ tokenHash });
    if (!row || row.usedAt || row.expiresAt.getTime() < Date.now())
      throw new BadRequestException('Liên kết không hợp lệ hoặc đã hết hạn');
    await this.users.update(row.userId, { passwordHash: await bcrypt.hash(password, 10) });
    await this.resets.update(row.id, { usedAt: new Date() });
    return { message: 'Đã đặt lại mật khẩu. Hãy đăng nhập bằng mật khẩu mới.' };
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string) {
    const user = await this.users.createQueryBuilder('u').addSelect('u.passwordHash').where('u.id = :userId', { userId }).getOne();
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) throw new BadRequestException('Mật khẩu hiện tại không đúng');
    if (currentPassword === newPassword) throw new BadRequestException('Mật khẩu mới phải khác mật khẩu cũ');
    await this.users.update(userId, { passwordHash: await bcrypt.hash(newPassword, 10) });
    return { message: 'Đã đổi mật khẩu' };
  }
}
