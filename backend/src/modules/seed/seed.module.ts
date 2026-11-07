import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Faculty } from '../catalog/entities/faculty.entity';
import { Subject } from '../catalog/entities/subject.entity';
import { SeedService } from './seed.service';

@Module({ imports: [TypeOrmModule.forFeature([Faculty, Subject])], providers: [SeedService] })
export class SeedModule {}
