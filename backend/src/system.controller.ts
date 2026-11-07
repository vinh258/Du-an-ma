import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('System')
@Controller('system')
export class SystemController {
  constructor(private readonly config: ConfigService) {}

  /** Giao diện dùng để biết có hiện nút AI hay không */
  @Get('features')
  features() { return { ai: !!this.config.get('ANTHROPIC_API_KEY'), mail: !!this.config.get('SMTP_HOST') }; }
}
