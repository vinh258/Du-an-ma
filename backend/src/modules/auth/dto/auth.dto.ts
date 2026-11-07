import { Type } from 'class-transformer';
import { IsEmail, IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Email không hợp lệ' }) email: string;
  @IsString() @MinLength(6, { message: 'Mật khẩu tối thiểu 6 ký tự' }) @MaxLength(64) password: string;
  @IsString() @MinLength(2) @MaxLength(150) fullName: string;
  @IsOptional() @IsString() @MaxLength(30) studentCode?: string;
  @IsOptional() @Type(() => Number) @IsInt() facultyId?: number;
}
export class LoginDto {
  @IsEmail() email: string;
  @IsString() password: string;
}
export class RefreshDto {
  @IsString() refreshToken: string;
}

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Email không hợp lệ' }) email: string;
}
export class ResetPasswordDto {
  @IsString() token: string;
  @IsString() @MinLength(6, { message: 'Mật khẩu tối thiểu 6 ký tự' }) @MaxLength(64) password: string;
}
export class ChangePasswordDto {
  @IsString() currentPassword: string;
  @IsString() @MinLength(6, { message: 'Mật khẩu mới tối thiểu 6 ký tự' }) @MaxLength(64) newPassword: string;
}
