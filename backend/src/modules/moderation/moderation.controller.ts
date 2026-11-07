import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, Roles } from '../../common/decorators';
import { Role } from '../../common/enums';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { PageQuery } from '../../common/pagination';
import { BulkReviewDto, CreateReportDto, RejectDocumentDto, ReportQuery, ResolveReportDto } from './dto/moderation.dto';
import { ModerationService } from './moderation.service';

@ApiTags('Moderation')
@ApiBearerAuth()
@Controller('moderation')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.MOD, Role.ADMIN)
export class ModerationController {
  constructor(private readonly moderation: ModerationService) {}

  @Get('queue') queue(@Query() q: PageQuery) { return this.moderation.getQueue(q); }
  @Get('queue/:id') queueItem(@Param('id', ParseIntPipe) id: number) { return this.moderation.getQueueItem(id); }

  @Post('documents/:id/approve') @HttpCode(200)
  approve(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') modId: number) { return this.moderation.approve(id, modId); }

  @Post('documents/:id/reject') @HttpCode(200)
  reject(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') modId: number, @Body() dto: RejectDocumentDto) {
    return this.moderation.reject(id, modId, dto.reason);
  }

  /** Duyệt hoặc từ chối nhiều tài liệu cùng lúc */
  @Post('bulk') @HttpCode(200)
  bulk(@Body() dto: BulkReviewDto, @CurrentUser('id') modId: number) { return this.moderation.bulk(dto.ids, dto.action, modId, dto.reason); }

  @Get('logs') logs(@Query() q: PageQuery) { return this.moderation.getLogs(q); }
  @Get('reports') reports(@Query() q: ReportQuery) { return this.moderation.listReports(q); }

  @Patch('reports/:id')
  resolve(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') modId: number, @Body() dto: ResolveReportDto) {
    return this.moderation.resolveReport(id, modId, dto.action, dto.note);
  }
}

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('documents/:id/reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly moderation: ModerationService) {}

  @Post()
  create(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') uid: number, @Body() dto: CreateReportDto) {
    return this.moderation.createReport(id, uid, dto.reason);
  }
}
