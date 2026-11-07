import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsEnum, IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { PageQuery } from '../../../common/pagination';

export class RejectDocumentDto {
  @IsString() @MinLength(10, { message: 'Lý do từ chối tối thiểu 10 ký tự' }) @MaxLength(500) reason: string;
}
export class CreateReportDto {
  @IsString() @MinLength(10, { message: 'Hãy mô tả vi phạm (tối thiểu 10 ký tự)' }) @MaxLength(500) reason: string;
}
export class ResolveReportDto {
  @IsEnum(['VIOLATION', 'DISMISS']) action: 'VIOLATION' | 'DISMISS';
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}
export class ReportQuery extends PageQuery {
  @IsOptional() @IsEnum(['OPEN', 'RESOLVED', 'DISMISSED']) status?: 'OPEN' | 'RESOLVED' | 'DISMISSED';
}

export class BulkReviewDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(100) @Type(() => Number) @IsInt({ each: true }) ids: number[];
  @IsEnum(['APPROVE', 'REJECT']) action: 'APPROVE' | 'REJECT';
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}
