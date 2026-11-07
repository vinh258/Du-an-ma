import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Role } from '../../../common/enums';
import { PageQuery } from '../../../common/pagination';

export class UpdateProfileDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(150) fullName?: string;
  @IsOptional() @IsString() @MaxLength(500) avatarUrl?: string;
  @IsOptional() @IsString() @MaxLength(30) studentCode?: string;
  @IsOptional() @Type(() => Number) @IsInt() facultyId?: number;
}
export class AdminUserQuery extends PageQuery {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsEnum(Role) role?: Role;
}
export class SetRoleDto { @IsEnum(Role) role: Role; }
export class SetStatusDto { @IsEnum(['ACTIVE', 'BANNED']) status: 'ACTIVE' | 'BANNED'; }
export class AdjustReputationDto {
  @Type(() => Number) @IsInt() delta: number;
  @IsString() @MinLength(3) @MaxLength(40) reason: string;
}
