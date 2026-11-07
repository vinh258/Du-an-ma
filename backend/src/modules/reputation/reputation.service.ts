import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { PageQuery, pageResult } from '../../common/pagination';
import { User } from '../users/entities/user.entity';
import { ReputationLog } from './entities/reputation-log.entity';

@Injectable()
export class ReputationService {
  constructor(@InjectRepository(ReputationLog) private readonly logs: Repository<ReputationLog>) {}

  /** Cộng/trừ điểm + ghi log. Truyền manager để chạy chung transaction với nghiệp vụ gọi nó. */
  async adjust(manager: EntityManager, userId: number, delta: number, reason: string, refDocumentId?: number) {
    await manager.increment(User, { id: userId }, 'reputationScore', delta);
    await manager.insert(ReputationLog, { userId, delta, reason, refDocumentId: refDocumentId ?? null });
  }

  async getLogs(userId: number, q: PageQuery) {
    const [items, total] = await this.logs.findAndCount({
      where: { userId }, order: { createdAt: 'DESC' }, skip: (q.page - 1) * q.limit, take: q.limit,
    });
    return pageResult(items, total, q);
  }
}
