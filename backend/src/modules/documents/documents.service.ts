import {
  BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException, OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomUUID } from 'crypto';
import { extname } from 'path';
import { BadRequestException as BadReq } from '@nestjs/common';
import { DataSource, In, Repository } from 'typeorm';
import { AuthUser } from '../../common/decorators';
import { DocumentStatus, NotificationType, Role } from '../../common/enums';
import { pageResult } from '../../common/pagination';
import { AiService } from '../ai/ai.service';
import { AuditService } from '../audit/audit.service';
import { Subject } from '../catalog/entities/subject.entity';
import { Tag } from '../catalog/entities/tag.entity';
import { Bookmark } from '../interactions/entities/bookmark.entity';
import { Rating } from '../interactions/entities/rating.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { StorageService } from '../storage/storage.service';
import { AdminDocumentQuery, QueryDocumentDto, UpdateDocumentDto, UploadDocumentDto } from './dto/document.dto';
import { DocumentDownload } from './entities/document-download.entity';
import { DocumentEntity } from './entities/document.entity';

const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
export const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

const slugify = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const isStaff = (u?: AuthUser) => !!u && (u.role === Role.ADMIN || u.role === Role.MOD);

@Injectable()
export class DocumentsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DocumentsService.name);
  /** chống đếm lặp lượt xem: key → thời điểm xem gần nhất */
  private readonly viewed = new Map<string, number>();
  /** true khi đã có FULLTEXT index; nếu không thì tìm kiếm dùng LIKE */
  private hasFulltext = false;

  constructor(
    @InjectRepository(DocumentEntity) private readonly docs: Repository<DocumentEntity>,
    @InjectRepository(Subject) private readonly subjects: Repository<Subject>,
    @InjectRepository(Tag) private readonly tags: Repository<Tag>,
    @InjectRepository(Rating) private readonly ratings: Repository<Rating>,
    @InjectRepository(Bookmark) private readonly bookmarks: Repository<Bookmark>,
    @InjectRepository(DocumentDownload) private readonly downloads: Repository<DocumentDownload>,
    private readonly storage: StorageService,
    private readonly notifications: NotificationsService,
    private readonly ai: AiService,
    private readonly audit: AuditService,
    private readonly dataSource: DataSource,
  ) {}

  /** Tự tạo FULLTEXT index (ưu tiên ngram để tìm tiếng Việt tốt hơn). Bỏ qua nếu đã có. */
  async onApplicationBootstrap() {
    const base = 'ALTER TABLE documents ADD FULLTEXT INDEX ft_documents (title, description, content_text)';
    for (const sql of [`${base} WITH PARSER ngram`, base]) {
      try {
        await this.dataSource.query(sql);
        this.logger.log('Đã tạo FULLTEXT index ft_documents');
        this.hasFulltext = true;
        return;
      } catch (e: any) {
        if (e?.code === 'ER_DUP_KEYNAME') { this.hasFulltext = true; return; }
        this.logger.warn(`Tạo FULLTEXT index thất bại (${e?.message}), thử cách khác…`);
      }
    }
  }

  // ---------------------------------------------------------------- upload
  async upload(user: AuthUser, file: Express.Multer.File, dto: UploadDocumentDto) {
    if (!file) throw new BadRequestException('Thiếu file tải lên');
    this.validateFile(file);

    if (!(await this.subjects.exist({ where: { id: dto.subjectId } }))) throw new NotFoundException('Môn học không tồn tại');

    const fileHash = createHash('sha256').update(file.buffer).digest('hex');
    if (await this.docs.exist({ where: { fileHash } })) throw new ConflictException('Tài liệu này đã tồn tại trên hệ thống');

    const fileKey = `documents/${new Date().getFullYear()}/${randomUUID()}${extname(file.originalname).toLowerCase()}`;
    await this.storage.upload(fileKey, file.buffer, file.mimetype);

    try {
      const saved = await this.docs.save(this.docs.create({
        uploaderId: user.id, subjectId: dto.subjectId, title: dto.title.trim(), description: dto.description ?? null,
        fileKey, fileName: this.fixFileName(file.originalname), fileSize: file.size, mimeType: file.mimetype, fileHash,
        status: DocumentStatus.PENDING, tags: await this.resolveTags(dto.tags ?? []),
      }));
      this.extractInBackground(saved.id, file.buffer, file.mimetype);
      return { id: saved.id, status: saved.status, message: 'Tải lên thành công, tài liệu đang chờ kiểm duyệt' };
    } catch (err) {
      await this.storage.remove(fileKey); // tránh file mồ côi
      throw err;
    }
  }

  // ---------------------------------------------------------------- search
  async search(q: QueryDocumentDto) {
    const qb = this.baseListQuery().where('d.status = :st', { st: DocumentStatus.APPROVED });
    if (q.subjectId) qb.andWhere('d.subjectId = :sid', { sid: q.subjectId });
    if (q.facultyId) qb.andWhere('s.facultyId = :fid', { fid: q.facultyId });
    if (q.tags) {
      const slugs = q.tags.split(',').map((t) => slugify(t)).filter(Boolean);
      if (slugs.length)
        qb.andWhere(
          'd.id IN (SELECT dt.document_id FROM document_tags dt INNER JOIN tags tg ON tg.id = dt.tag_id WHERE tg.slug IN (:...slugs))',
          { slugs },
        );
    }
    const kw = q.q?.replace(/[+\-<>()~*"@]/g, ' ').trim();
    if (kw) {
      qb.andWhere(
        this.hasFulltext
          ? '(MATCH(d.title, d.description, d.content_text) AGAINST (:kw IN NATURAL LANGUAGE MODE) OR d.title LIKE :like OR d.description LIKE :like)'
          : '(d.title LIKE :like OR d.description LIKE :like)',
        { kw, like: `%${kw}%` },
      );
    }
    const sort = { newest: 'd.createdAt', popular: 'd.viewCount', rating: 'd.ratingAvg', downloads: 'd.downloadCount' }[q.sort || 'newest'];
    const [items, total] = await qb.orderBy(sort, 'DESC').addOrderBy('d.id', 'DESC')
      .skip((q.page - 1) * q.limit).take(q.limit).getManyAndCount();
    return pageResult(items, total, q);
  }

  async listMine(userId: number, q: { page: number; limit: number }) {
    const [items, total] = await this.baseListQuery().where('d.uploaderId = :userId', { userId })
      .orderBy('d.createdAt', 'DESC').skip((q.page - 1) * q.limit).take(q.limit).getManyAndCount();
    return pageResult(items, total, q as any);
  }

  // ---------------------------------------------------------------- detail
  async detail(id: number, user: AuthUser | undefined, ip: string) {
    const doc = await this.baseListQuery().where('d.id = :id', { id }).getOne();
    if (!doc) throw new NotFoundException('Không tìm thấy tài liệu');
    const canSeePrivate = isStaff(user) || user?.id === doc.uploaderId;
    if (doc.status !== DocumentStatus.APPROVED && !canSeePrivate) throw new NotFoundException('Không tìm thấy tài liệu');

    if (doc.status === DocumentStatus.APPROVED) await this.countView(doc, user, ip);

    const [myRating, bookmark] = user
      ? await Promise.all([
          this.ratings.findOneBy({ documentId: id, userId: user.id }),
          this.bookmarks.findOneBy({ documentId: id, userId: user.id }),
        ])
      : [null, null];
    return { ...doc, fileKey: undefined, myRating: myRating?.score ?? null, bookmarked: !!bookmark };
  }

  private async countView(doc: DocumentEntity, user: AuthUser | undefined, ip: string) {
    const key = `${doc.id}:${user?.id ?? ip}`;
    const last = this.viewed.get(key) ?? 0;
    if (Date.now() - last < 30 * 60 * 1000) return;
    this.viewed.set(key, Date.now());
    if (this.viewed.size > 5000) this.viewed.clear();
    await this.docs.increment({ id: doc.id }, 'viewCount', 1);
    doc.viewCount += 1;
  }

  // -------------------------------------------------------------- download
  async download(id: number, user: AuthUser) {
    const doc = await this.docs.findOneBy({ id });
    if (!doc) throw new NotFoundException('Không tìm thấy tài liệu');
    if (doc.status !== DocumentStatus.APPROVED && !(isStaff(user) || user.id === doc.uploaderId))
      throw new NotFoundException('Không tìm thấy tài liệu');
    const url = await this.storage.getDownloadUrl(doc.fileKey, doc.fileName);
    await this.docs.increment({ id }, 'downloadCount', 1);
    await this.downloads.save({ documentId: id, userId: user.id });
    return { url, fileName: doc.fileName };
  }

  // ---------------------------------------------------------- update/delete
  /** Sửa thông tin (và tuỳ chọn thay file). Chỉ người đăng được sửa; sau khi sửa tài liệu phải được duyệt lại. */
  async update(id: number, user: AuthUser, dto: UpdateDocumentDto, file?: Express.Multer.File) {
    const doc = await this.docs.findOne({ where: { id }, relations: { tags: true } });
    if (!doc) throw new NotFoundException('Không tìm thấy tài liệu');
    if (doc.uploaderId !== user.id) throw new ForbiddenException('Chỉ người đăng mới được sửa tài liệu');

    if (dto.subjectId && !(await this.subjects.exist({ where: { id: dto.subjectId } }))) throw new NotFoundException('Môn học không tồn tại');
    if (dto.title !== undefined) doc.title = dto.title.trim();
    if (dto.description !== undefined) doc.description = dto.description;
    if (dto.subjectId) doc.subjectId = dto.subjectId;
    if (dto.tags) doc.tags = await this.resolveTags(dto.tags);

    // Thay file (nếu có)
    const oldKey = doc.fileKey;
    let newKey: string | null = null;
    if (file) {
      this.validateFile(file);
      const fileHash = createHash('sha256').update(file.buffer).digest('hex');
      const dup = await this.docs.findOneBy({ fileHash });
      if (dup && dup.id !== id) throw new ConflictException('File này đã tồn tại trên hệ thống');
      newKey = `documents/${new Date().getFullYear()}/${randomUUID()}${extname(file.originalname).toLowerCase()}`;
      await this.storage.upload(newKey, file.buffer, file.mimetype);
      Object.assign(doc, {
        fileKey: newKey, fileName: this.fixFileName(file.originalname), fileSize: file.size, mimeType: file.mimetype, fileHash, contentText: null,
      });
    }

    // Sửa nội dung → duyệt lại
    doc.status = DocumentStatus.PENDING;
    doc.rejectReason = null; doc.reviewedById = null; doc.reviewedAt = null;
    try {
      await this.docs.save(doc);
    } catch (e) {
      if (newKey) await this.storage.remove(newKey);
      throw e;
    }
    if (newKey && file) {
      await this.storage.remove(oldKey);
      this.extractInBackground(id, file.buffer, file.mimetype);
    }
    return this.baseListQuery().where('d.id = :id', { id }).getOne();
  }

  /** Người đăng xóa bài của mình; ADMIN xóa được bài của bất kỳ ai (kèm lý do → gửi thông báo cho người đăng). */
  async remove(id: number, user: AuthUser, reason?: string) {
    const doc = await this.docs.findOneBy({ id });
    if (!doc) throw new NotFoundException('Không tìm thấy tài liệu');
    const isOwner = doc.uploaderId === user.id;
    if (!isOwner && user.role !== Role.ADMIN) throw new ForbiddenException('Bạn không có quyền xóa tài liệu này');

    await this.docs.delete(id);
    await this.storage.remove(doc.fileKey);

    if (!isOwner) {
      await this.audit.log(user.id, 'DOC_DELETED', 'document', id, `${doc.title}${reason ? ' — ' + reason : ''}`);
      await this.notifications.notify(doc.uploaderId, NotificationType.DOC_DELETED, {
        title: doc.title, reason: reason?.trim() || 'Không nêu lý do', by: user.fullName,
      });
    }
    return { success: true };
  }

  // ------------------------------------------------- trending / liên quan / xem trước / AI
  /** Top tài liệu được tải nhiều nhất trong 7 ngày qua */
  async trending(limit = 5) {
    const rows: { id: number }[] = await this.dataSource.query(
      `SELECT d.id FROM documents d
       LEFT JOIN document_downloads dl ON dl.document_id = d.id AND dl.created_at >= (UTC_TIMESTAMP() - INTERVAL 7 DAY)
       WHERE d.status = 'APPROVED'
       GROUP BY d.id ORDER BY COUNT(dl.id) DESC, d.view_count DESC, d.id DESC LIMIT ?`, [limit]);
    return this.loadByIds(rows.map((r) => r.id));
  }

  /** Tài liệu liên quan: cùng tag (ưu tiên nhiều tag chung) hoặc cùng môn học */
  async related(id: number, limit = 6) {
    const doc = await this.docs.findOneBy({ id });
    if (!doc) throw new NotFoundException('Không tìm thấy tài liệu');
    const rows: { id: number }[] = await this.dataSource.query(
      `SELECT d.id,
         (SELECT COUNT(*) FROM document_tags a INNER JOIN document_tags b ON a.tag_id = b.tag_id
           WHERE a.document_id = d.id AND b.document_id = ?) AS shared,
         (d.subject_id = ?) AS same_subject
       FROM documents d WHERE d.status = 'APPROVED' AND d.id <> ?
       HAVING shared > 0 OR same_subject = 1
       ORDER BY shared DESC, same_subject DESC, d.rating_avg DESC, d.download_count DESC LIMIT ?`,
      [id, doc.subjectId, id, limit]);
    return this.loadByIds(rows.map((r) => r.id));
  }

  /** Link xem trực tiếp (inline) trong trình duyệt, không tính lượt tải */
  async preview(id: number, user: AuthUser) {
    const doc = await this.docs.findOneBy({ id });
    if (!doc) throw new NotFoundException('Không tìm thấy tài liệu');
    if (doc.status !== DocumentStatus.APPROVED && !(isStaff(user) || user.id === doc.uploaderId)) throw new NotFoundException('Không tìm thấy tài liệu');
    return { url: await this.storage.getDownloadUrl(doc.fileKey, doc.fileName, true), mimeType: doc.mimeType };
  }

  /** Tóm tắt bằng AI + gợi ý tag. Chỉ người đăng hoặc Mod/Admin được tạo; kết quả được lưu lại. */
  async aiSummary(id: number, user: AuthUser) {
    const doc = await this.docs.createQueryBuilder('d').addSelect('d.contentText').where('d.id = :id', { id }).getOne();
    if (!doc) throw new NotFoundException('Không tìm thấy tài liệu');
    if (!(isStaff(user) || user.id === doc.uploaderId)) throw new ForbiddenException('Bạn không có quyền dùng tính năng này cho tài liệu này');
    if (!doc.contentText || doc.contentText.length < 50)
      throw new BadReq('Chưa trích xuất được nội dung văn bản của tài liệu (file có thể là ảnh scan hoặc đang được xử lý)');
    const result = await this.ai.summarize(doc.title, doc.contentText);
    await this.docs.update(id, { aiSummary: result.summary });
    return { summary: result.summary, suggestedTags: result.tags };
  }

  /** Danh sách mọi tài liệu (mọi trạng thái) cho trang quản trị */
  async adminList(q: AdminDocumentQuery) {
    const qb = this.baseListQuery();
    if (q.status) qb.andWhere('d.status = :st', { st: q.status });
    if (q.q) qb.andWhere('(d.title LIKE :k OR u.fullName LIKE :k)', { k: `%${q.q}%` });
    const [items, total] = await qb.orderBy('d.createdAt', 'DESC').skip((q.page - 1) * q.limit).take(q.limit).getManyAndCount();
    return pageResult(items, total, q);
  }

  private async loadByIds(ids: number[]) {
    if (!ids.length) return [];
    const docs = await this.baseListQuery().where('d.id IN (:...ids)', { ids }).getMany();
    const byId = new Map(docs.map((d) => [d.id, d]));
    return ids.map((i) => byId.get(i)).filter((d): d is DocumentEntity => !!d);
  }

  // --------------------------------------------------------------- helpers
  private baseListQuery() {
    return this.docs.createQueryBuilder('d')
      .leftJoin('d.uploader', 'u').addSelect(['u.id', 'u.fullName', 'u.avatarUrl', 'u.reputationScore'])
      .leftJoinAndSelect('d.subject', 's').leftJoinAndSelect('s.faculty', 'f')
      .leftJoinAndSelect('d.tags', 't');
  }

  private validateFile(file: Express.Multer.File) {
    if (!ALLOWED_MIME.has(file.mimetype)) throw new BadRequestException('Chỉ chấp nhận PDF hoặc Word (.doc, .docx)');
    if (file.size > MAX_FILE_SIZE) throw new BadRequestException('File vượt quá 20MB');
  }

  private fixFileName(name: string) {
    // multer đọc tên file theo latin1 → sửa lại thành UTF-8 (tên tiếng Việt)
    return /[^\u0000-\u00ff]/.test(name) ? name : Buffer.from(name, 'latin1').toString('utf8');
  }

  private async resolveTags(names: string[]): Promise<Tag[]> {
    const bySlug = new Map<string, string>();
    for (const n of names) { const s = slugify(n); if (s && !bySlug.has(s)) bySlug.set(s, n.trim().slice(0, 50)); }
    if (!bySlug.size) return [];
    const slugs = [...bySlug.keys()];
    const existing = await this.tags.findBy({ slug: In(slugs) });
    const have = new Set(existing.map((t) => t.slug));
    const created = await this.tags.save(
      slugs.filter((s) => !have.has(s)).map((slug) => this.tags.create({ slug, name: bySlug.get(slug)! })),
    );
    return [...existing, ...created];
  }

  /** Trích text từ PDF/DOCX để phục vụ full-text search; lỗi thì bỏ qua */
  private extractInBackground(id: number, buffer: Buffer, mime: string) {
    (async () => {
      let text = '';
      if (mime === 'application/pdf') {
        const pdfParse = require('pdf-parse/lib/pdf-parse.js');
        text = (await pdfParse(buffer)).text;
      } else if (mime.includes('wordprocessingml')) {
        text = (await require('mammoth').extractRawText({ buffer })).value;
      }
      text = text.replace(/\s+/g, ' ').trim().slice(0, 400_000);
      if (text) await this.docs.update(id, { contentText: text });
    })().catch((e) => this.logger.warn(`Không trích xuất được nội dung doc #${id}: ${e?.message}`));
  }
}
