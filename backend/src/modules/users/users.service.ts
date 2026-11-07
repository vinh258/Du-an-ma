import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { DocumentStatus } from '../../common/enums';
import { PageResult } from './types';
import { pageResult } from '../../common/pagination';
import { DocumentEntity } from '../documents/entities/document.entity';
import { AuditService } from '../audit/audit.service';
import { ReputationService } from '../reputation/reputation.service';
import { AdjustReputationDto, AdminUserQuery, UpdateProfileDto } from './dto/users.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(DocumentEntity) private readonly docs: Repository<DocumentEntity>,
    private readonly dataSource: DataSource,
    private readonly reputation: ReputationService,
    private readonly audit: AuditService,
  ) {}

  getMe(id: number) {
    return this.users.findOneOrFail({ where: { id }, relations: { faculty: true } });
  }

  async updateMe(id: number, dto: UpdateProfileDto) {
    await this.users.update(id, dto);
    return this.getMe(id);
  }

  async getPublicProfile(id: number) {
    const user = await this.users.findOne({ where: { id }, relations: { faculty: true } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');
    const documents = await this.docs.find({
      where: { uploaderId: id, status: DocumentStatus.APPROVED },
      select: { id: true, title: true, viewCount: true, downloadCount: true, ratingAvg: true, ratingCount: true, createdAt: true },
      order: { createdAt: 'DESC' }, take: 50,
    });
    return {
      id: user.id, fullName: user.fullName, avatarUrl: user.avatarUrl, role: user.role,
      reputationScore: user.reputationScore, faculty: user.faculty, createdAt: user.createdAt, documents,
    };
  }

  async adminList(q: AdminUserQuery): Promise<PageResult<User>> {
    const qb = this.users.createQueryBuilder('u').leftJoinAndSelect('u.faculty', 'f');
    if (q.q) qb.andWhere('(u.email LIKE :k OR u.full_name LIKE :k)', { k: `%${q.q}%` });
    if (q.role) qb.andWhere('u.role = :role', { role: q.role });
    const [items, total] = await qb.orderBy('u.createdAt', 'DESC').skip((q.page - 1) * q.limit).take(q.limit).getManyAndCount();
    return pageResult(items, total, q);
  }

  async setRole(adminId: number, id: number, role: User['role']) {
    if (adminId === id) throw new BadRequestException('Không thể tự đổi quyền của chính mình');
    await this.mustExist(id);
    const before = await this.users.findOneBy({ id });
    await this.users.update(id, { role });
    await this.audit.log(adminId, 'USER_ROLE_CHANGED', 'user', id, `${before?.email}: ${before?.role} → ${role}`);
    return this.users.findOneByOrFail({ id });
  }

  async setStatus(adminId: number, id: number, status: User['status']) {
    if (adminId === id) throw new BadRequestException('Không thể tự khóa chính mình');
    await this.mustExist(id);
    await this.users.update(id, { status });
    await this.audit.log(adminId, 'USER_STATUS_CHANGED', 'user', id, status === 'BANNED' ? 'Khóa tài khoản' : 'Mở khóa tài khoản');
    return this.users.findOneByOrFail({ id });
  }

  async adjustReputation(adminId: number, id: number, dto: AdjustReputationDto) {
    await this.mustExist(id);
    await this.dataSource.transaction((m) => this.reputation.adjust(m, id, dto.delta, dto.reason));
    await this.audit.log(adminId, 'REPUTATION_ADJUSTED', 'user', id, `${dto.delta > 0 ? '+' : ''}${dto.delta}: ${dto.reason}`);
    return this.users.findOneByOrFail({ id });
  }

  getReputationLogs(userId: number, q: AdminUserQuery) { return this.reputation.getLogs(userId, q); }

  private async mustExist(id: number) {
    if (!(await this.users.exist({ where: { id } }))) throw new NotFoundException('Không tìm thấy người dùng');
  }
}
