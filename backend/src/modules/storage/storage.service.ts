import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { promises as fs } from 'fs';
import { dirname, resolve, sep } from 'path';

/**
 * Hai chế độ lưu file (chọn bằng STORAGE_DRIVER):
 *  - local: lưu vào thư mục UPLOAD_DIR (chạy được ngay, không cần AWS)
 *  - s3   : lưu lên AWS S3, tải về bằng presigned URL
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly driver: 'local' | 's3';
  private readonly baseDir: string;
  private readonly publicUrl: string;
  private s3: any;
  private bucket: string;

  constructor(private readonly config: ConfigService, private readonly jwt: JwtService) {
    this.driver = (config.get('STORAGE_DRIVER') || 'local') as 'local' | 's3';
    this.baseDir = resolve(config.get('UPLOAD_DIR') || 'uploads');
    this.publicUrl = config.get('API_PUBLIC_URL') || 'http://localhost:3000';
    this.bucket = config.get('AWS_S3_BUCKET') || '';
    this.logger.log(`Storage driver: ${this.driver}`);
  }

  private getS3() {
    if (!this.s3) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { S3Client } = require('@aws-sdk/client-s3');
      const endpoint = this.config.get('AWS_S3_ENDPOINT'); // để trống nếu dùng AWS S3
      this.s3 = new S3Client({
        region: this.config.getOrThrow('AWS_REGION'),
        ...(endpoint ? { endpoint, forcePathStyle: this.config.get('AWS_S3_FORCE_PATH_STYLE') !== 'false' } : {}),
        credentials: {
          accessKeyId: this.config.getOrThrow('AWS_ACCESS_KEY_ID'),
          secretAccessKey: this.config.getOrThrow('AWS_SECRET_ACCESS_KEY'),
        },
      });
    }
    return this.s3;
  }

  /** Chống path traversal: đường dẫn phải nằm trong thư mục upload */
  localPath(key: string) {
    const p = resolve(this.baseDir, key);
    if (!p.startsWith(this.baseDir + sep)) throw new Error('Invalid file key');
    return p;
  }

  async upload(key: string, body: Buffer, contentType: string) {
    if (this.driver === 's3') {
      const { PutObjectCommand } = require('@aws-sdk/client-s3');
      await this.getS3().send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }));
      return;
    }
    const p = this.localPath(key);
    await fs.mkdir(dirname(p), { recursive: true });
    await fs.writeFile(p, body);
  }

  async remove(key: string) {
    try {
      if (this.driver === 's3') {
        const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
        await this.getS3().send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
      } else {
        await fs.unlink(this.localPath(key));
      }
    } catch (e) {
      this.logger.warn(`Không xóa được file ${key}: ${(e as Error).message}`);
    }
  }

  /** Link tải có hạn 5 phút */
  async getDownloadUrl(key: string, fileName: string, inline = false): Promise<string> {
    if (this.driver === 's3') {
      const { GetObjectCommand } = require('@aws-sdk/client-s3');
      const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
      return getSignedUrl(
        this.getS3(),
        new GetObjectCommand({
          Bucket: this.bucket, Key: key,
          ResponseContentDisposition: `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        }),
        { expiresIn: 300 },
      );
    }
    const token = await this.jwt.signAsync({ purpose: 'file', key, name: fileName, inline }, { expiresIn: '5m' });
    return `${this.publicUrl}/api/v1/files/download?token=${token}`;
  }

  verifyFileToken(token: string): Promise<{ key: string; name: string; inline: boolean }> {
    return this.jwt.verifyAsync(token).then((p) => {
      if (p.purpose !== 'file') throw new Error('bad token');
      return { key: p.key, name: p.name, inline: !!p.inline };
    });
  }
}
