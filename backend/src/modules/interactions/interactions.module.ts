import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentEntity } from '../documents/entities/document.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReputationModule } from '../reputation/reputation.module';
import { Bookmark } from './entities/bookmark.entity';
import { Comment } from './entities/comment.entity';
import { Rating } from './entities/rating.entity';
import { InteractionsController } from './interactions.controller';
import { InteractionsService } from './interactions.service';

@Module({
  imports: [TypeOrmModule.forFeature([DocumentEntity, Rating, Comment, Bookmark]), ReputationModule, NotificationsModule],
  controllers: [InteractionsController],
  providers: [InteractionsService],
})
export class InteractionsModule {}
