import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { PageQuery } from '../../common/pagination';

export class StatsQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(7) @Max(90) days: number = 30;
}
export class BulkDeleteDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(100) @Type(() => Number) @IsInt({ each: true }) ids: number[];
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}
export class RenameTagDto {
  @IsString() @MinLength(1) @MaxLength(50) name: string;
}
export class MergeTagsDto {
  @IsArray() @ArrayMinSize(1) @Type(() => Number) @IsInt({ each: true }) sourceIds: number[];
  @Type(() => Number) @IsInt() targetId: number;
}
export class AnnouncementDto {
  @IsString() @MinLength(3) @MaxLength(100) title: string;
  @IsString() @MinLength(3) @MaxLength(500) message: string;
}
export class AuditListQuery extends PageQuery {
  @IsOptional() @IsString() action?: string;
  @IsOptional() @Type(() => Number) @IsInt() actorId?: number;
}
