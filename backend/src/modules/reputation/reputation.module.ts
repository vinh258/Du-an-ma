import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReputationLog } from './entities/reputation-log.entity';
import { ReputationService } from './reputation.service';

@Module({
  imports: [TypeOrmModule.forFeature([ReputationLog])],
  providers: [ReputationService],
  exports: [ReputationService],
})
export class ReputationModule {}
