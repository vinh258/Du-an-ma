import { ApiBearerAuth, ApiBody, ApiConsumes, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
  Body, Controller, Delete, Get, Ip, Param, ParseIntPipe, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthUser, CurrentUser, OptionalAuth } from '../../common/decorators';
import { JwtAuthGuard } from '../../common/guards';
import { PageQuery } from '../../common/pagination';
import { QueryDocumentDto, UpdateDocumentDto, UploadDocumentDto } from './dto/document.dto';
import { DocumentsService, MAX_FILE_SIZE } from './documents.service';

@ApiTags('Documents')
@ApiBearerAuth()
@Controller('documents')
export class DocumentsController {
  constructor(private readonly service: DocumentsService) {}

  @Post() @UseGuards(JwtAuthGuard)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'title', 'subjectId'],
      properties: {
        file: { type: 'string', format: 'binary', description: 'PDF hoặc Word, tối đa 20MB' },
        title: { type: 'string', example: 'Đề thi giải tích giữa kỳ' },
        subjectId: { type: 'integer', example: 1 },
        description: { type: 'string' },
        tags: { type: 'string', example: 'đề thi, giữa kỳ', description: 'Ngăn cách bằng dấu phẩy' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MAX_FILE_SIZE } }))
  upload(@CurrentUser() user: AuthUser, @UploadedFile() file: Express.Multer.File, @Body() dto: UploadDocumentDto) {
    return this.service.upload(user, file, dto);
  }

  @Get() search(@Query() q: QueryDocumentDto) { return this.service.search(q); }

  @Get('trending') trending() { return this.service.trending(5); }

  @Get('me') @UseGuards(JwtAuthGuard)
  mine(@CurrentUser('id') id: number, @Query() q: PageQuery) { return this.service.listMine(id, q); }

  @Get(':id') @UseGuards(JwtAuthGuard) @OptionalAuth()
  detail(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser | undefined, @Ip() ip: string) {
    return this.service.detail(id, user, ip);
  }

  @Get(':id/related')
  related(@Param('id', ParseIntPipe) id: number) { return this.service.related(id); }

  @Get(':id/preview') @UseGuards(JwtAuthGuard)
  preview(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) { return this.service.preview(id, user); }

  /** Tóm tắt bằng AI (cần ANTHROPIC_API_KEY). Chỉ người đăng hoặc Mod/Admin. */
  @Post(':id/ai-summary') @UseGuards(JwtAuthGuard)
  aiSummary(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) { return this.service.aiSummary(id, user); }

  @Get(':id/download') @UseGuards(JwtAuthGuard)
  download(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) { return this.service.download(id, user); }

  /** Sửa thông tin tài liệu, có thể kèm file mới (multipart). Sau khi sửa tài liệu quay lại trạng thái chờ duyệt. */
  @Patch(':id') @UseGuards(JwtAuthGuard)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: 'Tuỳ chọn: thay file mới (PDF/Word ≤ 20MB)' },
        title: { type: 'string' }, description: { type: 'string' }, subjectId: { type: 'integer' },
        tags: { type: 'string', description: 'Ngăn cách bằng dấu phẩy' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MAX_FILE_SIZE } }))
  update(
    @Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser,
    @Body() dto: UpdateDocumentDto, @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.service.update(id, user, dto, file);
  }

  /** Người đăng xóa bài của mình; ADMIN xóa được bài của mọi người (nên kèm `reason` để thông báo cho người đăng). */
  @Delete(':id') @UseGuards(JwtAuthGuard)
  @ApiQuery({ name: 'reason', required: false, description: 'Lý do xóa (dùng khi ADMIN xóa bài người khác)' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser, @Query('reason') reason?: string) {
    return this.service.remove(id, user, reason);
  }
}
