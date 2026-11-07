import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { Faculty } from './entities/faculty.entity';
import { Subject } from './entities/subject.entity';
import { Tag } from './entities/tag.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Faculty, Subject, Tag])],
  controllers: [CatalogController],
  providers: [CatalogService],
  exports: [TypeOrmModule],
})
export class CatalogModule {}
