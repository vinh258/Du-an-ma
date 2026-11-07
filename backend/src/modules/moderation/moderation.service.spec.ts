import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DocumentStatus, NotificationType } from '../../common/enums';
import { DocumentEntity } from '../documents/entities/document.entity';
import { ModerationLog } from './entities/moderation-log.entity';
import { ModerationService, POINTS } from './moderation.service';

/** Dựng ModerationService với các phụ thuộc giả (mock), không cần database. */
function setup(doc: Partial<DocumentEntity> | null) {
  const qb: any = { setLock: () => qb, where: () => qb, getOne: async () => doc };
  const manager: any = { getRepository: () => ({ createQueryBuilder: () => qb }), update: jest.fn(), insert: jest.fn() };
  const dataSource: any = { transaction: (cb: any) => cb(manager) };
  const reputation = { adjust: jest.fn() };
  const notifications = { notify: jest.fn() };
  const audit = { log: jest.fn() };
  const service = new ModerationService(dataSource, {} as any, {} as any, {} as any, reputation as any, notifications as any, audit as any);
  return { service, manager, reputation, notifications, audit };
}

const pending = { id: 5, title: 'Đề thi giải tích', uploaderId: 10, status: DocumentStatus.PENDING };

describe('ModerationService', () => {
  it('duyệt: cập nhật trạng thái, ghi log, +10 điểm uy tín và thông báo người đăng', async () => {
    const t = setup(pending);
    const res = await t.service.approve(5, 99);

    expect(res).toEqual({ id: 5, status: DocumentStatus.APPROVED });
    expect(t.manager.update).toHaveBeenCalledWith(DocumentEntity, 5, expect.objectContaining({ status: DocumentStatus.APPROVED, reviewedById: 99, rejectReason: null }));
    expect(t.manager.insert).toHaveBeenCalledWith(ModerationLog, expect.objectContaining({ documentId: 5, moderatorId: 99, action: 'APPROVE' }));
    expect(t.reputation.adjust).toHaveBeenCalledWith(t.manager, 10, POINTS.APPROVED, 'DOC_APPROVED', 5);
    expect(POINTS.APPROVED).toBe(10);
    expect(t.notifications.notify).toHaveBeenCalledWith(10, NotificationType.DOC_APPROVED, expect.objectContaining({ documentId: 5 }));
    expect(t.audit.log).toHaveBeenCalledWith(99, 'DOC_APPROVED', 'document', 5, expect.any(String));
  });

  it('từ chối: lưu lý do, -5 điểm uy tín và thông báo kèm lý do', async () => {
    const t = setup(pending);
    const res = await t.service.reject(5, 99, 'Nội dung trùng lặp với tài liệu khác');

    expect(res.status).toBe(DocumentStatus.REJECTED);
    expect(t.manager.update).toHaveBeenCalledWith(DocumentEntity, 5, expect.objectContaining({ rejectReason: 'Nội dung trùng lặp với tài liệu khác' }));
    expect(t.reputation.adjust).toHaveBeenCalledWith(t.manager, 10, -5, 'DOC_REJECTED', 5);
    expect(t.notifications.notify).toHaveBeenCalledWith(10, NotificationType.DOC_REJECTED, expect.objectContaining({ reason: 'Nội dung trùng lặp với tài liệu khác' }));
  });

  it('không cho người kiểm duyệt tự duyệt tài liệu của chính mình', async () => {
    const t = setup(pending);
    await expect(t.service.approve(5, 10)).rejects.toBeInstanceOf(BadRequestException);
    expect(t.reputation.adjust).not.toHaveBeenCalled();
    expect(t.notifications.notify).not.toHaveBeenCalled();
  });

  it('không duyệt lại tài liệu đã được xử lý', async () => {
    const t = setup({ ...pending, status: DocumentStatus.APPROVED });
    await expect(t.service.approve(5, 99)).rejects.toThrow('đã được xử lý');
    expect(t.manager.update).not.toHaveBeenCalled();
  });

  it('báo lỗi 404 khi tài liệu không tồn tại', async () => {
    const t = setup(null);
    await expect(t.service.approve(404, 99)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('duyệt hàng loạt: bài lỗi được bỏ qua và báo lại, bài hợp lệ vẫn được xử lý', async () => {
    const t = setup(pending);
    // lần 1 thành công, lần 2 tài liệu đã xử lý
    let call = 0;
    (t.manager.getRepository as any) = () => ({ createQueryBuilder: () => ({ setLock() { return this; }, where() { return this; }, getOne: async () => (call++ === 0 ? pending : { ...pending, status: DocumentStatus.APPROVED }) }) });
    const res = await t.service.bulk([5, 6], 'APPROVE', 99);
    expect(res.done).toBe(1);
    expect(res.failed).toHaveLength(1);
    expect(res.failed[0].id).toBe(6);
  });

  it('từ chối hàng loạt bắt buộc có lý do đủ dài', async () => {
    const t = setup(pending);
    await expect(t.service.bulk([5], 'REJECT', 99, 'ngắn')).rejects.toBeInstanceOf(BadRequestException);
  });
});
