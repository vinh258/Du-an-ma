import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { FacultyDto, SubjectDto, UpdateFacultyDto, UpdateSubjectDto } from './dto/catalog.dto';
import { Faculty } from './entities/faculty.entity';
import { Subject } from './entities/subject.entity';
import { Tag } from './entities/tag.entity';

@Injectable()
export class CatalogService {
  constructor(
    @InjectRepository(Faculty) private readonly faculties: Repository<Faculty>,
    @InjectRepository(Subject) private readonly subjects: Repository<Subject>,
    @InjectRepository(Tag) private readonly tags: Repository<Tag>,
    private readonly audit: AuditService,
  ) {}

  listFaculties() { return this.faculties.find({ order: { name: 'ASC' } }); }

  listSubjects(facultyId?: number) {
    return this.subjects.find({ where: facultyId ? { facultyId } : {}, relations: { faculty: true }, order: { name: 'ASC' } });
  }

  async createFaculty(dto: FacultyDto, actorId: number) {
    let saved: Faculty;
    try { saved = await this.faculties.save(this.faculties.create(dto)); } catch { throw new ConflictException('Tên hoặc mã khoa đã tồn tại'); }
    await this.audit.log(actorId, 'FACULTY_CREATED', 'faculty', saved.id, `${dto.code} · ${dto.name}`);
    return saved;
  }
  async updateFaculty(id: number, dto: UpdateFacultyDto, actorId: number) {
    await this.mustFind(this.faculties, id, 'khoa');
    try { await this.faculties.update(id, dto); } catch { throw new ConflictException('Tên hoặc mã khoa đã tồn tại'); }
    await this.audit.log(actorId, 'FACULTY_UPDATED', 'faculty', id, JSON.stringify(dto));
    return this.faculties.findOneBy({ id });
  }
  async deleteFaculty(id: number, actorId: number) {
    const f = await this.faculties.findOneBy({ id });
    await this.mustFind(this.faculties, id, 'khoa');
    try { await this.faculties.delete(id); } catch { throw new ConflictException('Khoa đang có môn học hoặc người dùng, không thể xóa'); }
    await this.audit.log(actorId, 'FACULTY_DELETED', 'faculty', id, f?.name);
    return { success: true };
  }

  async createSubject(dto: SubjectDto, actorId: number) {
    await this.mustFind(this.faculties, dto.facultyId, 'khoa');
    let saved: Subject;
    try { saved = await this.subjects.save(this.subjects.create(dto)); } catch { throw new ConflictException('Mã môn học đã tồn tại'); }
    await this.audit.log(actorId, 'SUBJECT_CREATED', 'subject', saved.id, `${dto.code} · ${dto.name}`);
    return saved;
  }
  async updateSubject(id: number, dto: UpdateSubjectDto, actorId: number) {
    await this.mustFind(this.subjects, id, 'môn học');
    try { await this.subjects.update(id, dto); } catch { throw new ConflictException('Mã môn học đã tồn tại'); }
    await this.audit.log(actorId, 'SUBJECT_UPDATED', 'subject', id, JSON.stringify(dto));
    return this.subjects.findOneBy({ id });
  }
  async deleteSubject(id: number, actorId: number) {
    const sub = await this.subjects.findOneBy({ id });
    await this.mustFind(this.subjects, id, 'môn học');
    try { await this.subjects.delete(id); } catch { throw new ConflictException('Môn học đang có tài liệu, không thể xóa'); }
    await this.audit.log(actorId, 'SUBJECT_DELETED', 'subject', id, sub?.name);
    return { success: true };
  }

  searchTags(q?: string) {
    return this.tags.find({ where: q ? { name: Like(`%${q}%`) } : {}, order: { name: 'ASC' }, take: 20 });
  }

  private async mustFind(repo: Repository<any>, id: number, label: string) {
    if (!(await repo.exist({ where: { id } }))) throw new NotFoundException(`Không tìm thấy ${label}`);
  }
}
