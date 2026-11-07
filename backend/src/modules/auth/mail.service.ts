import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Gửi email qua SMTP nếu có cấu hình (SMTP_HOST...). Không có thì chỉ in ra console (dùng khi phát triển). */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  constructor(private readonly config: ConfigService) {}

  get enabled() { return !!this.config.get('SMTP_HOST'); }

  async send(to: string, subject: string, html: string): Promise<boolean> {
    if (!this.enabled) return false;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const nodemailer = require('nodemailer');
      const transport = nodemailer.createTransport({
        host: this.config.get('SMTP_HOST'),
        port: +(this.config.get('SMTP_PORT') || 587),
        secure: this.config.get('SMTP_SECURE') === 'true',
        auth: this.config.get('SMTP_USER') ? { user: this.config.get('SMTP_USER'), pass: this.config.get('SMTP_PASS') } : undefined,
      });
      await transport.sendMail({ from: this.config.get('SMTP_FROM') || this.config.get('SMTP_USER'), to, subject, html });
      return true;
    } catch (e) {
      this.logger.error(`Gửi email thất bại: ${(e as Error).message}`);
      return false;
    }
  }
}
