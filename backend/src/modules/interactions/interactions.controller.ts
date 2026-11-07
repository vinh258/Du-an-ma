import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { AuthUser, CurrentUser } from '../../common/decorators';
import { JwtAuthGuard } from '../../common/guards';
import { PageQuery } from '../../common/pagination';
import { CreateCommentDto, RateDto, UpdateCommentDto } from './dto/interactions.dto';
import { InteractionsService } from './interactions.service';

@ApiTags('Interactions')
@ApiBearerAuth()
@Controller()
export class InteractionsController {
  constructor(private readonly service: InteractionsService) {}

  @Put('documents/:id/rating') @UseGuards(JwtAuthGuard)
  rate(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: AuthUser, @Body() dto: RateDto) { return this.service.rate(id, u, dto.score); }

  @Get('documents/:id/comments')
  comments(@Param('id', ParseIntPipe) id: number) { return this.service.listComments(id); }

  @Post('documents/:id/comments') @UseGuards(JwtAuthGuard)
  addComment(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: AuthUser, @Body() dto: CreateCommentDto) {
    return this.service.addComment(id, u, dto.content, dto.parentId);
  }

  @Patch('comments/:id') @UseGuards(JwtAuthGuard)
  editComment(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: AuthUser, @Body() dto: UpdateCommentDto) {
    return this.service.editComment(id, u, dto.content);
  }

  @Delete('comments/:id') @UseGuards(JwtAuthGuard)
  deleteComment(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: AuthUser) { return this.service.deleteComment(id, u); }

  @Put('documents/:id/bookmark') @UseGuards(JwtAuthGuard)
  bookmark(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') uid: number) { return this.service.addBookmark(id, uid); }

  @Delete('documents/:id/bookmark') @UseGuards(JwtAuthGuard)
  unbookmark(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') uid: number) { return this.service.removeBookmark(id, uid); }

  @Get('users/me/bookmarks') @UseGuards(JwtAuthGuard)
  myBookmarks(@CurrentUser('id') uid: number, @Query() q: PageQuery) { return this.service.myBookmarks(uid, q); }
}
