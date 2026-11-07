import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PageQuery, pageResult } from '../../common/pagination';
import { AuditLog } from './audit-log.entity';

export class AuditQuery extends PageQuery {
  action?: string;
  actorId?: number;
}

/** Ghi lại ai đã làm gì. Lỗi ghi log không được làm hỏng nghiệp vụ chính. */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  constructor(@InjectRepository(AuditLog) private readonly repo: Repository<AuditLog>) {}

  async log(actorId: number | null, action: string, targetType?: string, targetId?: number, detail?: string) {
    try {
      await this.repo.insert({ actorId, action, targetType: targetType ?? null, targetId: targetId ?? null, detail: detail?.slice(0, 500) ?? null });
    } catch (e) {
      this.logger.warn(`Không ghi được audit log: ${(e as Error).message}`);
    }
  }

  async list(q: AuditQuery) {
    const qb = this.repo.createQueryBuilder('a')
      .leftJoin('a.actor', 'u').addSelect(['u.id', 'u.fullName', 'u.email', 'u.role']);
    if (q.action) qb.andWhere('a.action = :action', { action: q.action });
    if (q.actorId) qb.andWhere('a.actorId = :actorId', { actorId: q.actorId });
    const [items, total] = await qb.orderBy('a.createdAt', 'DESC').addOrderBy('a.id', 'DESC')
      .skip((q.page - 1) * q.limit).take(q.limit).getManyAndCount();
    const actions = await this.repo.createQueryBuilder('a').select('DISTINCT a.action', 'action').getRawMany();
    return { ...pageResult(items, total, q), actions: actions.map((r) => r.action as string).sort() };
  }
}
