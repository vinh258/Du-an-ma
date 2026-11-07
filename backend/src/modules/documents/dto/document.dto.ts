import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsEnum, IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { PageQuery } from '../../../common/pagination';

const toTagArray = ({ value }: { value: unknown }) =>
  (Array.isArray(value) ? value : String(value ?? '').split(','))
    .map((t: string) => String(t).trim()).filter(Boolean);

export class UploadDocumentDto {
  @IsString() @MinLength(5, { message: 'Tiêu đề tối thiểu 5 ký tự' }) @MaxLength(255) title: string;
  @IsOptional() @IsString() @MaxLength(5000) description?: string;
  @Type(() => Number) @IsInt({ message: 'Hãy chọn môn học' }) subjectId: number;
  @IsOptional() @Transform(toTagArray) @IsArray() @ArrayMaxSize(10, { message: 'Tối đa 10 tag' }) tags?: string[];
}

export class UpdateDocumentDto {
  @IsOptional() @IsString() @MinLength(5) @MaxLength(255) title?: string;
  @IsOptional() @IsString() @MaxLength(5000) description?: string;
  @IsOptional() @Type(() => Number) @IsInt() subjectId?: number;
  @IsOptional() @Transform(toTagArray) @IsArray() @ArrayMaxSize(10) tags?: string[];
}

export class QueryDocumentDto extends PageQuery {
  @IsOptional() @IsString() @MaxLength(200) q?: string;
  @IsOptional() @Type(() => Number) @IsInt() subjectId?: number;
  @IsOptional() @Type(() => Number) @IsInt() facultyId?: number;
  /** danh sách slug, ngăn cách bởi dấu phẩy */
  @IsOptional() @IsString() tags?: string;
  @ApiPropertyOptional({ enum: ['newest', 'popular', 'rating', 'downloads'], default: 'newest' })
  @IsOptional() @IsEnum(['newest', 'popular', 'rating', 'downloads']) sort?: 'newest' | 'popular' | 'rating' | 'downloads';
}

export class AdminDocumentQuery extends PageQuery {
  @IsOptional() @IsString() @MaxLength(200) q?: string;
  @IsOptional() @IsEnum(['PENDING', 'APPROVED', 'REJECTED']) status?: 'PENDING' | 'APPROVED' | 'REJECTED';
}
