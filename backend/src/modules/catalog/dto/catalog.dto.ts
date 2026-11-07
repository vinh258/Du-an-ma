import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class FacultyDto {
  @IsString() @MinLength(2) @MaxLength(150) name: string;
  @IsString() @MinLength(1) @MaxLength(20) code: string;
}
export class UpdateFacultyDto {
  @IsOptional() @IsString() @MaxLength(150) name?: string;
  @IsOptional() @IsString() @MaxLength(20) code?: string;
}
export class SubjectDto {
  @Type(() => Number) @IsInt() facultyId: number;
  @IsString() @MinLength(1) @MaxLength(20) code: string;
  @IsString() @MinLength(2) @MaxLength(200) name: string;
}
export class UpdateSubjectDto {
  @IsOptional() @Type(() => Number) @IsInt() facultyId?: number;
  @IsOptional() @IsString() @MaxLength(20) code?: string;
  @IsOptional() @IsString() @MaxLength(200) name?: string;
}
