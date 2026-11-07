import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Controller, Get, Param, ParseIntPipe, Patch, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators';
import { JwtAuthGuard } from '../../common/guards';
import { PageQuery } from '../../common/pagination';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  list(@CurrentUser('id') uid: number, @Query() q: PageQuery, @Query('unread') unread?: string) {
    return this.service.list(uid, q, unread === 'true');
  }

  @Get('unread-count')
  unreadCount(@CurrentUser('id') uid: number) { return this.service.unreadCount(uid); }

  @Patch('read-all')
  readAll(@CurrentUser('id') uid: number) { return this.service.markAllRead(uid); }

  @Patch(':id/read')
  read(@CurrentUser('id') uid: number, @Param('id', ParseIntPipe) id: number) { return this.service.markRead(uid, id); }
}
