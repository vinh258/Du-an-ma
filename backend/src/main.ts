import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.set('trust proxy', 1); // chạy sau proxy/load balancer (Render, Railway...) → lấy đúng IP người dùng
  app.setGlobalPrefix('api/v1');
  app.enableCors({ origin: true, credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // ===== Swagger: tài liệu API tại /api/docs =====
  const config = new DocumentBuilder()
    .setTitle('TVinhhh API')
    .setDescription(
      'API của hệ thống quản lý và chia sẻ tài liệu học tập.\n\n' +
      '**Cách thử API cần đăng nhập:** gọi `POST /auth/login` → copy `accessToken` → bấm nút **Authorize** (góc phải) → dán token → Authorize.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true, tagsSorter: 'alpha', docExpansion: 'none' },
    customSiteTitle: 'TVinhhh API Docs',
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  const log = new Logger('Bootstrap');
  log.log(`API chạy tại http://localhost:${port}/api/v1`);
  log.log(`Swagger docs tại http://localhost:${port}/api/docs`);
}
bootstrap();
