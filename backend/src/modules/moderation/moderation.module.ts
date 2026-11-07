import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentEntity } from '../documents/entities/document.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReputationModule } from '../reputation/reputation.module';
import { ModerationLog } from './entities/moderation-log.entity';
import { Report } from './entities/report.entity';
import { ModerationController, ReportsController } from './moderation.controller';
import { ModerationService } from './moderation.service';

@Module({
  imports: [TypeOrmModule.forFeature([DocumentEntity, ModerationLog, Report]), ReputationModule, NotificationsModule],
  controllers: [ModerationController, ReportsController],
  providers: [ModerationService],
  exports: [ModerationService],
})
export class ModerationModule {}
