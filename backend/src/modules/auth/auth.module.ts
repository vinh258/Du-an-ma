import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MailService } from './mail.service';
import { PasswordReset } from './password-reset.entity';

@Module({ imports: [TypeOrmModule.forFeature([PasswordReset])], controllers: [AuthController], providers: [AuthService, MailService] })
export class AuthModule {}
