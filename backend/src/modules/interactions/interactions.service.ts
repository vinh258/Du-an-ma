import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuthUser } from '../../common/decorators';
import { DocumentStatus, NotificationType, Role } from '../../common/enums';
import { PageQuery, pageResult } from '../../common/pagination';
import { DocumentEntity } from '../documents/entities/document.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { ReputationService } from '../reputation/reputation.service';
import { Bookmark } from './entities/bookmark.entity';
import { Comment } from './entities/comment.entity';
import { Rating } from './entities/rating.entity';

@Injectable()
export class InteractionsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(DocumentEntity) private readonly docs: Repository<DocumentEntity>,
    @InjectRepository(Comment) private readonly comments: Repository<Comment>,
    @InjectRepository(Bookmark) private readonly bookmarks: Repository<Bookmark>,
    private readonly reputation: ReputationService,
    private readonly notifications: NotificationsService,
  ) {}

  private async approvedDoc(id: number) {
    const doc = await this.docs.findOneBy({ id });
    if (!doc || doc.status !== DocumentStatus.APPROVED) throw new NotFoundException('Không tìm thấy tài liệu');
    return doc;
  }

  // ------------------------------------------------------------------ rating
  async rate(documentId: number, user: AuthUser, score: number) {
    const doc = await this.approvedDoc(documentId);
    if (doc.uploaderId === user.id) throw new BadRequestException('Bạn không thể tự đánh giá tài liệu của mình');

    const { isNew, avg, count } = await this.dataSource.transaction(async (m) => {
      const existing = await m.findOneBy(Rating, { documentId, userId: user.id });
      if (existing) await m.update(Rating, existing.id, { score });
      else await m.insert(Rating, { documentId, userId: user.id, score });

      const agg = await m.createQueryBuilder(Rating, 'r')
        .select('AVG(r.score)', 'avg').addSelect('COUNT(*)', 'cnt').where('r.document_id = :documentId', { documentId }).getRawOne();
      const avg = Number(agg.avg) || 0, count = Number(agg.cnt) || 0;
      await m.update(DocumentEntity, documentId, { ratingAvg: Math.round(avg * 100) / 100, ratingCount: count });
      if (!existing && score === 5) await this.reputation.adjust(m, doc.uploaderId, 1, 'DOC_RATED_HIGH', documentId);
      return { isNew: !existing, avg, count };
    });

    if (isNew) await this.notifications.notify(doc.uploaderId, NotificationType.NEW_RATING,
      { documentId, title: doc.title, score, by: user.fullName });
    return { ratingAvg: Math.round(avg * 100) / 100, ratingCount: count, myRating: score };
  }

  // ---------------------------------------------------------------- comments
  async listComments(documentId: number) {
    await this.approvedDoc(documentId);
    const rows = await this.comments.find({
      where: { documentId }, relations: { user: true }, order: { createdAt: 'ASC' }, take: 500,
      select: { user: { id: true, fullName: true, avatarUrl: true, role: true } } as any,
    });
    type Node = ReturnType<typeof this.toNode>;
    const byId = new Map<number, Node>();
    const roots: Node[] = [];
    rows.forEach((c) => byId.set(c.id, this.toNode(c)));
    byId.forEach((n) => {
      const parent = n.parentId ? byId.get(n.parentId) : null;
      (parent ? parent.replies : roots).push(n);
    });
    return roots.reverse(); // bình luận mới nhất lên đầu
  }

  private toNode(c: Comment) {
    return {
      id: c.id, parentId: c.parentId, content: c.isDeleted ? '' : c.content, isDeleted: c.isDeleted,
      createdAt: c.createdAt, editedAt: c.editedAt, user: c.user, replies: [] as any[],
    };
  }

  async addComment(documentId: number, user: AuthUser, content: string, parentId?: number) {
    const doc = await this.approvedDoc(documentId);
    let parent: Comment | null = null;
    if (parentId) {
      parent = await this.comments.findOneBy({ id: parentId, documentId });
      if (!parent) throw new BadRequestException('Bình luận gốc không tồn tại');
    }
    const saved = await this.comments.save(this.comments.create({ documentId, userId: user.id, content: content.trim(), parentId: parentId ?? null }));

    const targets = new Set<number>([doc.uploaderId, ...(parent ? [parent.userId] : [])]);
    targets.delete(user.id);
    for (const t of targets)
      await this.notifications.notify(t, NotificationType.NEW_COMMENT, { documentId, title: doc.title, by: user.fullName, commentId: saved.id });
    return this.toNode({ ...saved, user: { id: user.id, fullName: user.fullName, role: user.role } as any });
  }

  async editComment(id: number, user: AuthUser, content: string) {
    const c = await this.comments.findOneBy({ id });
    if (!c || c.isDeleted) throw new NotFoundException('Không tìm thấy bình luận');
    if (c.userId !== user.id) throw new ForbiddenException('Chỉ người viết mới được sửa bình luận');
    await this.comments.update(id, { content: content.trim(), editedAt: new Date() });
    return { success: true };
  }

  async deleteComment(id: number, user: AuthUser) {
    const c = await this.comments.findOneBy({ id });
    if (!c) throw new NotFoundException('Không tìm thấy bình luận');
    if (c.userId !== user.id && user.role === Role.STUDENT) throw new ForbiddenException('Bạn không có quyền xóa bình luận này');
    await this.comments.update(id, { isDeleted: true });
    return { success: true };
  }

  // --------------------------------------------------------------- bookmarks
  async addBookmark(documentId: number, userId: number) {
    await this.approvedDoc(documentId);
    await this.bookmarks.upsert({ userId, documentId }, ['userId', 'documentId']);
    return { bookmarked: true };
  }

  async removeBookmark(documentId: number, userId: number) {
    await this.bookmarks.delete({ userId, documentId });
    return { bookmarked: false };
  }

  async myBookmarks(userId: number, q: PageQuery) {
    const [rows, total] = await this.bookmarks.createQueryBuilder('b')
      .innerJoinAndSelect('b.document', 'd')
      .leftJoinAndSelect('d.subject', 's').leftJoinAndSelect('s.faculty', 'f')
      .where('b.user_id = :userId', { userId }).andWhere('d.status = :st', { st: DocumentStatus.APPROVED })
      .orderBy('b.createdAt', 'DESC').skip((q.page - 1) * q.limit).take(q.limit).getManyAndCount();
    return pageResult(rows.map((b) => ({ ...b.document, bookmarkedAt: b.createdAt })), total, q);
  }
}
