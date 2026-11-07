import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { DocumentStatus, NotificationType } from '../../common/enums';
import { PageQuery, pageResult } from '../../common/pagination';
import { AuditService } from '../audit/audit.service';
import { DocumentEntity } from '../documents/entities/document.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { ReputationService } from '../reputation/reputation.service';
import { ReportQuery } from './dto/moderation.dto';
import { ModerationLog } from './entities/moderation-log.entity';
import { Report } from './entities/report.entity';

export const POINTS = { APPROVED: 10, REJECTED: -5, VIOLATION: -20 };

@Injectable()
export class ModerationService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(DocumentEntity) private readonly docs: Repository<DocumentEntity>,
    @InjectRepository(ModerationLog) private readonly logs: Repository<ModerationLog>,
    @InjectRepository(Report) private readonly reports: Repository<Report>,
    private readonly reputation: ReputationService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  async getQueue(q: PageQuery) {
    const [items, total] = await this.docs.findAndCount({
      where: { status: DocumentStatus.PENDING },
      relations: { subject: { faculty: true }, tags: true },
      order: { createdAt: 'ASC' }, // FIFO: cũ nhất duyệt trước
      skip: (q.page - 1) * q.limit, take: q.limit,
    });
    const uploaders = await this.loadUploaders(items.map((i) => i.uploaderId));
    return pageResult(items.map((d) => ({ ...d, uploader: uploaders.get(d.uploaderId) })), total, q);
  }

  async getQueueItem(id: number) {
    const doc = await this.docs.findOne({ where: { id }, relations: { subject: { faculty: true }, tags: true } });
    if (!doc) throw new NotFoundException('Không tìm thấy tài liệu');
    const uploader = (await this.loadUploaders([doc.uploaderId])).get(doc.uploaderId);
    return { ...doc, uploader, fileKey: undefined };
  }

  approve(docId: number, moderatorId: number) { return this.review(docId, moderatorId, 'APPROVE'); }
  reject(docId: number, moderatorId: number, reason: string) { return this.review(docId, moderatorId, 'REJECT', reason); }

  private async review(docId: number, moderatorId: number, action: 'APPROVE' | 'REJECT', reason?: string) {
    const result = await this.dataSource.transaction(async (m) => {
      const doc = await m.getRepository(DocumentEntity).createQueryBuilder('d')
        .setLock('pessimistic_write') // khóa dòng: 2 mod không duyệt trùng cùng lúc
        .where('d.id = :id', { id: docId }).getOne();

      if (!doc) throw new NotFoundException('Không tìm thấy tài liệu');
      if (doc.status !== DocumentStatus.PENDING) throw new BadRequestException('Tài liệu đã được xử lý trước đó');
      if (doc.uploaderId === moderatorId) throw new BadRequestException('Không thể tự duyệt tài liệu của chính mình');

      const approved = action === 'APPROVE';
      await m.update(DocumentEntity, doc.id, {
        status: approved ? DocumentStatus.APPROVED : DocumentStatus.REJECTED,
        rejectReason: approved ? null : reason,
        reviewedById: moderatorId,
        reviewedAt: new Date(),
      });
      await m.insert(ModerationLog, { documentId: doc.id, moderatorId, action, reason: reason ?? null });
      await this.reputation.adjust(m, doc.uploaderId, approved ? POINTS.APPROVED : POINTS.REJECTED,
        approved ? 'DOC_APPROVED' : 'DOC_REJECTED', doc.id);
      return { id: doc.id, title: doc.title, uploaderId: doc.uploaderId, approved };
    });

    await this.audit.log(moderatorId, result.approved ? 'DOC_APPROVED' : 'DOC_REJECTED', 'document', result.id,
      `${result.title}${reason ? ' — ' + reason : ''}`);
    // Gửi thông báo SAU khi transaction commit
    await this.notifications.notify(
      result.uploaderId,
      result.approved ? NotificationType.DOC_APPROVED : NotificationType.DOC_REJECTED,
      { documentId: result.id, title: result.title, reason },
    );
    return { id: result.id, status: result.approved ? DocumentStatus.APPROVED : DocumentStatus.REJECTED };
  }

  /** Duyệt/từ chối nhiều tài liệu cùng lúc. Bài nào lỗi thì bỏ qua và báo lại. */
  async bulk(ids: number[], action: 'APPROVE' | 'REJECT', moderatorId: number, reason?: string) {
    if (action === 'REJECT' && (reason?.trim().length ?? 0) < 10) throw new BadRequestException('Lý do từ chối tối thiểu 10 ký tự');
    const failed: { id: number; message: string }[] = [];
    let done = 0;
    for (const id of [...new Set(ids)]) {
      try { await this.review(id, moderatorId, action, reason); done++; }
      catch (e) { failed.push({ id, message: (e as Error).message }); }
    }
    return { done, failed };
  }

  async getLogs(q: PageQuery) {
    const [items, total] = await this.logs.findAndCount({
      relations: { moderator: true, document: true }, order: { createdAt: 'DESC' },
      select: { moderator: { id: true, fullName: true }, document: { id: true, title: true } } as any,
      skip: (q.page - 1) * q.limit, take: q.limit,
    });
    return pageResult(items, total, q);
  }

  // ----------------------------------------------------------------- reports
  async createReport(documentId: number, reporterId: number, reason: string) {
    const doc = await this.docs.findOneBy({ id: documentId });
    if (!doc) throw new NotFoundException('Không tìm thấy tài liệu');
    if (doc.uploaderId === reporterId) throw new BadRequestException('Bạn không thể báo cáo tài liệu của chính mình');
    if (await this.reports.exist({ where: { documentId, reporterId, status: 'OPEN' } }))
      throw new BadRequestException('Bạn đã báo cáo tài liệu này, vui lòng chờ xử lý');
    await this.reports.save(this.reports.create({ documentId, reporterId, reason }));
    return { success: true, message: 'Đã gửi báo cáo, cảm ơn bạn' };
  }

  async listReports(q: ReportQuery) {
    const [items, total] = await this.reports.findAndCount({
      where: { status: q.status ?? 'OPEN' }, relations: { document: true, reporter: true },
      select: { reporter: { id: true, fullName: true }, document: { id: true, title: true, status: true } } as any,
      order: { createdAt: 'ASC' }, skip: (q.page - 1) * q.limit, take: q.limit,
    });
    return pageResult(items, total, q);
  }

  async resolveReport(reportId: number, moderatorId: number, action: 'VIOLATION' | 'DISMISS', note?: string) {
    const out = await this.dataSource.transaction(async (m) => {
      const report = await m.findOneBy(Report, { id: reportId });
      if (!report) throw new NotFoundException('Không tìm thấy báo cáo');
      if (report.status !== 'OPEN') throw new BadRequestException('Báo cáo đã được xử lý');

      if (action === 'DISMISS') {
        await m.update(Report, reportId, { status: 'DISMISSED' });
        return null;
      }
      const doc = await m.getRepository(DocumentEntity).createQueryBuilder('d')
        .setLock('pessimistic_write').where('d.id = :id', { id: report.documentId }).getOne();
      if (!doc) throw new NotFoundException('Tài liệu không còn tồn tại');

      const why = note || `Vi phạm: ${report.reason}`;
      await m.update(DocumentEntity, doc.id, {
        status: DocumentStatus.REJECTED, rejectReason: why.slice(0, 500), reviewedById: moderatorId, reviewedAt: new Date(),
      });
      await m.insert(ModerationLog, { documentId: doc.id, moderatorId, action: 'REJECT', reason: why.slice(0, 500) });
      await this.reputation.adjust(m, doc.uploaderId, POINTS.VIOLATION, 'VIOLATION', doc.id);
      await m.update(Report, { documentId: doc.id, status: 'OPEN' }, { status: 'RESOLVED' });
      return { uploaderId: doc.uploaderId, documentId: doc.id, title: doc.title, reason: why };
    });
    await this.audit.log(moderatorId, 'REPORT_RESOLVED', 'report', reportId, `${action}${note ? ' — ' + note : ''}`);
    if (out) await this.notifications.notify(out.uploaderId, NotificationType.DOC_VIOLATION,
      { documentId: out.documentId, title: out.title, reason: out.reason });
    return { success: true };
  }

  private async loadUploaders(ids: number[]) {
    const map = new Map<number, any>();
    if (!ids.length) return map;
    const rows = await this.dataSource.getRepository('users').createQueryBuilder('u')
      .select(['u.id', 'u.fullName', 'u.avatarUrl', 'u.reputationScore']).where('u.id IN (:...ids)', { ids }).getMany();
    rows.forEach((r: any) => map.set(r.id, r));
    return map;
  }
}
