import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subject } from '../catalog/entities/subject.entity';
import { Tag } from '../catalog/entities/tag.entity';
import { Bookmark } from '../interactions/entities/bookmark.entity';
import { Rating } from '../interactions/entities/rating.entity';
import { AiModule } from '../ai/ai.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { StorageModule } from '../storage/storage.module';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DocumentDownload } from './entities/document-download.entity';
import { DocumentEntity } from './entities/document.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DocumentEntity, DocumentDownload, Subject, Tag, Rating, Bookmark]), StorageModule, NotificationsModule, AiModule],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [TypeOrmModule, DocumentsService],
})
export class DocumentsModule {}
