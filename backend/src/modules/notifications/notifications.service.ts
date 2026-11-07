import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { NotificationType } from '../../common/enums';
import { PageQuery, pageResult } from '../../common/pagination';
import { Notification } from './entities/notification.entity';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification) private readonly repo: Repository<Notification>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly gateway: NotificationsGateway,
  ) {}

  /** Lưu DB + đẩy realtime. Lỗi thông báo không được làm hỏng nghiệp vụ chính. */
  async notify(userId: number, type: NotificationType, payload: Record<string, any>) {
    try {
      const saved = await this.repo.save(this.repo.create({ userId, type, payload, isRead: false }));
      this.gateway.pushToUser(userId, saved);
    } catch (e) {
      console.error('notify failed', e);
    }
  }

  /** Gửi thông báo tới TẤT CẢ người dùng đang hoạt động (thông báo chung của quản trị viên) */
  async broadcast(type: NotificationType, payload: Record<string, any>): Promise<number> {
    const ids = (await this.users.find({ where: { status: 'ACTIVE' }, select: { id: true } })).map((u) => u.id);
    for (let i = 0; i < ids.length; i += 500) {
      await this.repo.insert(ids.slice(i, i + 500).map((userId) => ({ userId, type, payload, isRead: false })));
    }
    const now = new Date();
    ids.forEach((id) => this.gateway.pushToUser(id, { type, payload, isRead: false, createdAt: now }));
    return ids.length;
  }

  async list(userId: number, q: PageQuery, unreadOnly: boolean) {
    const [items, total] = await this.repo.findAndCount({
      where: unreadOnly ? { userId, isRead: false } : { userId },
      order: { createdAt: 'DESC' }, skip: (q.page - 1) * q.limit, take: q.limit,
    });
    return pageResult(items, total, q);
  }

  unreadCount(userId: number) {
    return this.repo.count({ where: { userId, isRead: false } }).then((count) => ({ count }));
  }

  async markRead(userId: number, id: number) {
    const res = await this.repo.update({ id, userId }, { isRead: true });
    if (!res.affected) throw new NotFoundException('Không tìm thấy thông báo');
    return { success: true };
  }

  async markAllRead(userId: number) {
    await this.repo.update({ userId, isRead: false }, { isRead: true });
    return { success: true };
  }
}
