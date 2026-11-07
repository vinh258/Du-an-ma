import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class RateDto {
  @Type(() => Number) @IsInt() @Min(1, { message: 'Điểm từ 1 đến 5' }) @Max(5, { message: 'Điểm từ 1 đến 5' }) score: number;
}
export class CreateCommentDto {
  @IsString() @MinLength(1, { message: 'Nội dung không được để trống' }) @MaxLength(2000) content: string;
  @IsOptional() @Type(() => Number) @IsInt() parentId?: number;
}

export class UpdateCommentDto {
  @IsString() @MinLength(1, { message: 'Nội dung không được để trống' }) @MaxLength(2000) content: string;
}
