import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PageQuery {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number) @IsOptional() @IsInt() @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @Type(() => Number) @IsOptional() @IsInt() @Min(1) @Max(100)
  limit: number = 20;
}

export const pageResult = <T>(items: T[], total: number, q: PageQuery) => ({
  items, total, page: q.page, limit: q.limit, totalPages: Math.ceil(total / q.limit),
});
