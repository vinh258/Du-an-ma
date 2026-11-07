import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuthUser } from '../../common/decorators';
import { NotificationType } from '../../common/enums';
import { AuditService } from '../audit/audit.service';
import { Tag } from '../catalog/entities/tag.entity';
import { DocumentsService } from '../documents/documents.service';
import { NotificationsService } from '../notifications/notifications.service';

const n = (v: unknown) => Number(v) || 0;
const slugify = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

/** Chống "CSV injection": ô bắt đầu bằng = + - @ sẽ bị Excel hiểu là công thức */
const csvCell = (v: unknown) => {
  let s = v === null || v === undefined ? '' : v instanceof Date ? v.toISOString() : String(v);
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};
const toCsv = (headers: string[], rows: unknown[][]) =>
  '\uFEFF' + [headers, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');

@Injectable()
export class AdminService {
  constructor(
    private readonly ds: DataSource,
    @InjectRepository(Tag) private readonly tags: Repository<Tag>,
    private readonly documents: DocumentsService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  // ------------------------------------------------------------- thống kê
  async stats(days: number) {
    const q = (sql: string, p: unknown[] = []) => this.ds.query(sql, p);
    const week = '(UTC_TIMESTAMP() - INTERVAL 7 DAY)';

    const [u] = await q(`SELECT COUNT(*) total, SUM(status='ACTIVE') active, SUM(status='BANNED') banned,
      SUM(role='MOD') mods, SUM(role='ADMIN') admins, SUM(created_at >= ${week}) new7 FROM users`);
    const [d] = await q(`SELECT COUNT(*) total, SUM(status='PENDING') pending, SUM(status='APPROVED') approved,
      SUM(status='REJECTED') rejected, COALESCE(SUM(download_count),0) downloads, COALESCE(SUM(view_count),0) views,
      SUM(created_at >= ${week}) new7 FROM documents`);
    const [c] = await q(`SELECT (SELECT COUNT(*) FROM comments WHERE is_deleted = 0) comments,
      (SELECT COUNT(*) FROM ratings) ratings, (SELECT COUNT(*) FROM bookmarks) bookmarks,
      (SELECT COUNT(*) FROM reports WHERE status = 'OPEN') openReports`);
    const [m] = await q(`SELECT SUM(action='APPROVE') approve, SUM(action='REJECT') reject FROM moderation_logs`);

    const dates: string[] = [];
    for (let i = days - 1; i >= 0; i--) dates.push(new Date(Date.now() - i * 86400000).toISOString().slice(0, 10));
    const series = async (table: string) => {
      const rows = await q(`SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS day, COUNT(*) AS c FROM ${table}
        WHERE created_at >= (UTC_TIMESTAMP() - INTERVAL ? DAY) GROUP BY day`, [days]);
      const map = new Map<string, number>(rows.map((r: any) => [r.day, n(r.c)]));
      return dates.map((day) => map.get(day) ?? 0);
    };

    const byFaculty = await q(`SELECT f.id, f.name, f.code, COUNT(d.id) docs, COALESCE(SUM(d.download_count),0) downloads
      FROM faculties f LEFT JOIN subjects s ON s.faculty_id = f.id
      LEFT JOIN documents d ON d.subject_id = s.id AND d.status = 'APPROVED'
      GROUP BY f.id ORDER BY docs DESC, f.name`);
    const topContributors = await q(`SELECT u.id, u.full_name AS fullName, u.reputation_score AS reputation, COUNT(d.id) docs,
      COALESCE(SUM(d.download_count),0) downloads FROM users u
      INNER JOIN documents d ON d.uploader_id = u.id AND d.status = 'APPROVED'
      GROUP BY u.id ORDER BY docs DESC, downloads DESC LIMIT 5`);
    const topDocuments = await q(`SELECT id, title, download_count AS downloads, view_count AS views, rating_avg AS rating
      FROM documents WHERE status = 'APPROVED' ORDER BY download_count DESC, view_count DESC LIMIT 5`);

    return {
      users: { total: n(u.total), active: n(u.active), banned: n(u.banned), mods: n(u.mods), admins: n(u.admins), new7: n(u.new7) },
      documents: {
        total: n(d.total), pending: n(d.pending), approved: n(d.approved), rejected: n(d.rejected),
        downloads: n(d.downloads), views: n(d.views), new7: n(d.new7),
      },
      interactions: { comments: n(c.comments), ratings: n(c.ratings), bookmarks: n(c.bookmarks), openReports: n(c.openReports) },
      moderation: { approve: n(m.approve), reject: n(m.reject) },
      series: { dates, documents: await series('documents'), users: await series('users'), downloads: await series('document_downloads') },
      byFaculty: byFaculty.map((r: any) => ({ id: r.id, name: r.name, code: r.code, docs: n(r.docs), downloads: n(r.downloads) })),
      topContributors: topContributors.map((r: any) => ({ id: r.id, fullName: r.fullName, reputation: n(r.reputation), docs: n(r.docs), downloads: n(r.downloads) })),
      topDocuments: topDocuments.map((r: any) => ({ id: r.id, title: r.title, downloads: n(r.downloads), views: n(r.views), rating: n(r.rating) })),
    };
  }

  // -------------------------------------------------------- xóa hàng loạt
  async bulkDelete(admin: AuthUser, ids: number[], reason?: string) {
    const failed: { id: number; message: string }[] = [];
    let done = 0;
    for (const id of [...new Set(ids)]) {
      try { await this.documents.remove(id, admin, reason); done++; }
      catch (e) { failed.push({ id, message: (e as Error).message }); }
    }
    return { done, failed };
  }

  // --------------------------------------------------------------- xuất CSV
  async exportUsers(adminId: number) {
    const rows = await this.ds.query(`SELECT u.id, u.email, u.full_name, u.student_code, f.name AS faculty, u.role, u.status,
      u.reputation_score, u.created_at FROM users u LEFT JOIN faculties f ON f.id = u.faculty_id ORDER BY u.id`);
    await this.audit.log(adminId, 'EXPORT', 'users', undefined, `Xuất ${rows.length} người dùng`);
    return toCsv(['ID', 'Email', 'Họ tên', 'Mã SV', 'Khoa', 'Quyền', 'Trạng thái', 'Điểm uy tín', 'Ngày tạo'],
      rows.map((r: any) => [r.id, r.email, r.full_name, r.student_code, r.faculty, r.role, r.status, r.reputation_score, r.created_at]));
  }

  async exportDocuments(adminId: number) {
    const rows = await this.ds.query(`SELECT d.id, d.title, u.full_name AS uploader, s.code AS subject_code, s.name AS subject,
      d.status, d.view_count, d.download_count, d.rating_avg, d.rating_count, d.created_at
      FROM documents d INNER JOIN users u ON u.id = d.uploader_id INNER JOIN subjects s ON s.id = d.subject_id ORDER BY d.id`);
    await this.audit.log(adminId, 'EXPORT', 'documents', undefined, `Xuất ${rows.length} tài liệu`);
    return toCsv(['ID', 'Tiêu đề', 'Người đăng', 'Mã môn', 'Môn học', 'Trạng thái', 'Lượt xem', 'Lượt tải', 'Điểm TB', 'Số đánh giá', 'Ngày đăng'],
      rows.map((r: any) => [r.id, r.title, r.uploader, r.subject_code, r.subject, r.status, r.view_count, r.download_count, r.rating_avg, r.rating_count, r.created_at]));
  }

  // ----------------------------------------------------------------- tags
  async listTags() {
    const rows = await this.ds.query(`SELECT t.id, t.name, t.slug, COUNT(dt.document_id) AS uses
      FROM tags t LEFT JOIN document_tags dt ON dt.tag_id = t.id GROUP BY t.id ORDER BY uses DESC, t.name`);
    return rows.map((r: any) => ({ id: r.id, name: r.name, slug: r.slug, uses: n(r.uses) }));
  }

  async renameTag(adminId: number, id: number, name: string) {
    const tag = await this.tags.findOneBy({ id });
    if (!tag) throw new NotFoundException('Không tìm thấy tag');
    const slug = slugify(name);
    if (!slug) throw new BadRequestException('Tên tag không hợp lệ');
    const clash = await this.tags.findOneBy({ slug });
    if (clash && clash.id !== id) throw new ConflictException('Đã có tag trùng tên, hãy dùng chức năng Gộp tag');
    await this.tags.update(id, { name: name.trim(), slug });
    await this.audit.log(adminId, 'TAG_RENAMED', 'tag', id, `${tag.name} → ${name.trim()}`);
    return this.tags.findOneBy({ id });
  }

  async deleteTag(adminId: number, id: number) {
    const tag = await this.tags.findOneBy({ id });
    if (!tag) throw new NotFoundException('Không tìm thấy tag');
    await this.tags.delete(id); // bảng nối tự xóa theo (ON DELETE CASCADE)
    await this.audit.log(adminId, 'TAG_DELETED', 'tag', id, tag.name);
    return { success: true };
  }

  /** Gộp nhiều tag vào 1 tag đích: tài liệu gắn tag cũ sẽ chuyển sang tag đích */
  async mergeTags(adminId: number, sourceIds: number[], targetId: number) {
    const sources = [...new Set(sourceIds)].filter((i) => i !== targetId);
    if (!sources.length) throw new BadRequestException('Hãy chọn ít nhất một tag nguồn khác tag đích');
    const target = await this.tags.findOneBy({ id: targetId });
    if (!target) throw new NotFoundException('Không tìm thấy tag đích');
    const found = await this.tags.findByIds(sources);
    if (found.length !== sources.length) throw new NotFoundException('Có tag nguồn không tồn tại');

    const marks = sources.map(() => '?').join(',');
    await this.ds.transaction(async (m) => {
      await m.query(`INSERT IGNORE INTO document_tags (document_id, tag_id) SELECT document_id, ? FROM document_tags WHERE tag_id IN (${marks})`, [targetId, ...sources]);
      await m.query(`DELETE FROM document_tags WHERE tag_id IN (${marks})`, sources);
      await m.query(`DELETE FROM tags WHERE id IN (${marks})`, sources);
    });
    await this.audit.log(adminId, 'TAG_MERGED', 'tag', targetId, `${found.map((t) => t.name).join(', ')} → ${target.name}`);
    return { success: true, merged: sources.length };
  }

  // --------------------------------------------------- thông báo toàn hệ thống
  async announce(adminId: number, title: string, message: string) {
    const sent = await this.notifications.broadcast(NotificationType.ANNOUNCEMENT, { title, message });
    await this.audit.log(adminId, 'ANNOUNCEMENT_SENT', 'system', undefined, `${title} (${sent} người nhận)`);
    return { sent };
  }
}
