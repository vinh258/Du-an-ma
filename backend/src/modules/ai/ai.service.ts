import { BadGatewayException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AiResult { summary: string; tags: string[] }

/** Tóm tắt tài liệu + gợi ý tag bằng Claude API. Chỉ hoạt động khi có ANTHROPIC_API_KEY trong .env */
@Injectable()
export class AiService {
  constructor(private readonly config: ConfigService) {}

  get enabled() { return !!this.config.get('ANTHROPIC_API_KEY'); }

  async summarize(title: string, text: string): Promise<AiResult> {
    const key = this.config.get<string>('ANTHROPIC_API_KEY');
    if (!key) throw new ServiceUnavailableException('Chưa cấu hình ANTHROPIC_API_KEY nên chưa dùng được tính năng AI');

    const prompt =
      `Bạn là trợ lý thư viện học tập. Đọc tài liệu sau và trả về DUY NHẤT một đối tượng JSON, không kèm giải thích:\n` +
      `{"summary": "tóm tắt 3-5 câu bằng tiếng Việt", "tags": ["tối đa 5 từ khóa ngắn, tiếng Việt, chữ thường"]}\n\n` +
      `Tiêu đề: ${title}\n\nNội dung (có thể bị cắt bớt):\n${text.slice(0, 15000)}`;

    let res: Response;
    try {
      res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: this.config.get('ANTHROPIC_MODEL') || 'claude-sonnet-4-6',
          max_tokens: 700,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
    } catch {
      throw new BadGatewayException('Không kết nối được dịch vụ AI');
    }
    if (!res.ok) throw new BadGatewayException(`Dịch vụ AI trả về lỗi ${res.status}`);

    const data: any = await res.json();
    const raw: string = (data.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('');
    try {
      const json = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
      return {
        summary: String(json.summary || '').trim(),
        tags: (Array.isArray(json.tags) ? json.tags : []).map((t: any) => String(t).trim().toLowerCase()).filter(Boolean).slice(0, 5),
      };
    } catch {
      return { summary: raw.trim().slice(0, 1500), tags: [] };
    }
  }
}
