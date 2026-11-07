import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators';
import { JwtAuthGuard } from '../../common/guards';
import { AuthService } from './auth.service';
import { ChangePasswordDto, ForgotPasswordDto, LoginDto, RefreshDto, RegisterDto, ResetPasswordDto } from './dto/auth.dto';

// Giới hạn chống dò mật khẩu / spam: mặc định 10 lần / phút / IP
const AUTH_LIMIT = { default: { limit: Number(process.env.AUTH_THROTTLE_LIMIT || 10), ttl: 60_000 } };

@ApiTags('Auth')
@ApiBearerAuth()
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register') @Throttle(AUTH_LIMIT) register(@Body() dto: RegisterDto) { return this.auth.register(dto); }
  @Post('login') @HttpCode(200) @Throttle(AUTH_LIMIT) login(@Body() dto: LoginDto) { return this.auth.login(dto); }
  @Post('refresh') @HttpCode(200) refresh(@Body() dto: RefreshDto) { return this.auth.refresh(dto.refreshToken); }

  @Post('forgot-password') @HttpCode(200) @Throttle(AUTH_LIMIT)
  forgot(@Body() dto: ForgotPasswordDto) { return this.auth.forgotPassword(dto.email); }

  @Post('reset-password') @HttpCode(200) @Throttle(AUTH_LIMIT)
  reset(@Body() dto: ResetPasswordDto) { return this.auth.resetPassword(dto.token, dto.password); }

  @Post('change-password') @HttpCode(200) @UseGuards(JwtAuthGuard)
  change(@CurrentUser('id') id: number, @Body() dto: ChangePasswordDto) { return this.auth.changePassword(id, dto.currentPassword, dto.newPassword); }
}
