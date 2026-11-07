import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoreModule } from './common/core.module';
import { AdminModule } from './modules/admin/admin.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { InteractionsModule } from './modules/interactions/interactions.module';
import { ModerationModule } from './modules/moderation/moderation.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReputationModule } from './modules/reputation/reputation.module';
import { SeedModule } from './modules/seed/seed.module';
import { StorageModule } from './modules/storage/storage.module';
import { UsersModule } from './modules/users/users.module';
import { SystemController } from './system.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (c: ConfigService) => ({
        type: 'mysql' as const,
        // DB_SSL=true: bắt buộc với đa số MySQL trên cloud. Dán chứng chỉ CA vào DB_SSL_CA (thay xuống dòng bằng \n),
        // hoặc đặt DB_SSL_REJECT_UNAUTHORIZED=false để bỏ qua kiểm tra chứng chỉ (kém an toàn hơn, đủ cho đồ án).
        ssl: c.get<string>('DB_SSL') === 'true'
          ? (c.get<string>('DB_SSL_CA')
              ? { ca: c.get<string>('DB_SSL_CA')!.replace(/\\n/g, '\n') }
              : { rejectUnauthorized: c.get<string>('DB_SSL_REJECT_UNAUTHORIZED') !== 'false' })
          : undefined,
        host: c.get<string>('DB_HOST') || 'localhost',
        port: +(c.get<string>('DB_PORT') || 3306),
        username: c.get<string>('DB_USERNAME') || 'root',
        password: c.get<string>('DB_PASSWORD') || '',
        database: c.get<string>('DB_NAME') || 'academic_hub',
        charset: 'utf8mb4',
        timezone: 'Z',
        autoLoadEntities: true,
        synchronize: c.get<string>('DB_SYNCHRONIZE') !== 'false',
        logging: ['error'] as any,
      }),
    }),
    // Giới hạn tần suất gọi API (mặc định 300 lần/phút/IP); các API đăng nhập có hạn mức chặt hơn
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (c: ConfigService) => [{ ttl: 60_000, limit: +(c.get<string>('THROTTLE_LIMIT') || 300) }],
    }),
    CoreModule,
    AuditModule,
    AuthModule,
    UsersModule,
    ReputationModule,
    CatalogModule,
    StorageModule,
    DocumentsModule,
    ModerationModule,
    InteractionsModule,
    NotificationsModule,
    AdminModule,
    SeedModule,
  ],
  controllers: [SystemController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
