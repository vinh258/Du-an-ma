import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../modules/users/entities/user.entity';
import { JwtAuthGuard, RolesGuard } from './guards';

/** Module toàn cục: cung cấp JwtService + Repository<User> + guards cho mọi module */
@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (c: ConfigService) => ({
        secret: c.getOrThrow('JWT_SECRET'),
        signOptions: { expiresIn: c.get('JWT_EXPIRES_IN') || '1h' },
      }),
    }),
    TypeOrmModule.forFeature([User]),
  ],
  providers: [JwtAuthGuard, RolesGuard],
  exports: [JwtModule, TypeOrmModule, JwtAuthGuard, RolesGuard],
})
export class CoreModule {}
