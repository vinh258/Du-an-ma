import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Controller, ForbiddenException, Get, NotFoundException, Query, StreamableFile } from '@nestjs/common';
import { createReadStream, existsSync } from 'fs';
import { extname } from 'path';
import { StorageService } from './storage.service';

const MIME: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

/** Chỉ dùng cho driver local: tải file bằng token ký sẵn, hết hạn sau 5 phút */
@ApiTags('Files')
@ApiBearerAuth()
@Controller('files')
export class FilesController {
  constructor(private readonly storage: StorageService) {}

  @Get('download')
  async download(@Query('token') token: string) {
    let info: { key: string; name: string; inline: boolean };
    try { info = await this.storage.verifyFileToken(token); } catch { throw new ForbiddenException('Link tải không hợp lệ hoặc đã hết hạn'); }
    const path = this.storage.localPath(info.key);
    if (!existsSync(path)) throw new NotFoundException('File không còn tồn tại');
    return new StreamableFile(createReadStream(path), {
      type: MIME[extname(info.key).toLowerCase()] || 'application/octet-stream',
      disposition: `${info.inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(info.name)}`,
    });
  }
}
