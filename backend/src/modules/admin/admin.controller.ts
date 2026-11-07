import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Query, StreamableFile, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser, Roles } from '../../common/decorators';
import { Role } from '../../common/enums';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { AuditService } from '../audit/audit.service';
import { AdminDocumentQuery } from '../documents/dto/document.dto';
import { DocumentsService } from '../documents/documents.service';
import { AnnouncementDto, AuditListQuery, BulkDeleteDto, MergeTagsDto, RenameTagDto, StatsQuery } from './admin.dto';
import { AdminService } from './admin.service';

const csv = (content: string, name: string) =>
  new StreamableFile(Buffer.from(content, 'utf8'), { type: 'text/csv; charset=utf-8', disposition: `attachment; filename="${name}"` });

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly audit: AuditService,
    private readonly documents: DocumentsService,
  ) {}

  @Get('stats') stats(@Query() q: StatsQuery) { return this.admin.stats(q.days); }

  @Get('documents') documentsList(@Query() q: AdminDocumentQuery) { return this.documents.adminList(q); }

  @Post('documents/bulk-delete') @HttpCode(200)
  bulkDelete(@CurrentUser() admin: AuthUser, @Body() dto: BulkDeleteDto) { return this.admin.bulkDelete(admin, dto.ids, dto.reason); }

  @Get('audit-logs') auditLogs(@Query() q: AuditListQuery) { return this.audit.list(q); }

  @Get('export/users') async exportUsers(@CurrentUser('id') id: number) { return csv(await this.admin.exportUsers(id), 'nguoi-dung.csv'); }
  @Get('export/documents') async exportDocs(@CurrentUser('id') id: number) { return csv(await this.admin.exportDocuments(id), 'tai-lieu.csv'); }

  @Get('tags') tags() { return this.admin.listTags(); }
  @Post('tags/merge') @HttpCode(200)
  merge(@CurrentUser('id') id: number, @Body() dto: MergeTagsDto) { return this.admin.mergeTags(id, dto.sourceIds, dto.targetId); }
  @Patch('tags/:id')
  rename(@CurrentUser('id') uid: number, @Param('id', ParseIntPipe) id: number, @Body() dto: RenameTagDto) { return this.admin.renameTag(uid, id, dto.name); }
  @Delete('tags/:id')
  removeTag(@CurrentUser('id') uid: number, @Param('id', ParseIntPipe) id: number) { return this.admin.deleteTag(uid, id); }

  /** Gửi thông báo tới tất cả người dùng đang hoạt động (hiện realtime) */
  @Post('announcements') @HttpCode(200)
  announce(@CurrentUser('id') id: number, @Body() dto: AnnouncementDto) { return this.admin.announce(id, dto.title, dto.message); }
}
