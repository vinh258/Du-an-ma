import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { Role } from '../../common/enums';
import { Faculty } from '../catalog/entities/faculty.entity';
import { Subject } from '../catalog/entities/subject.entity';
import { User } from '../users/entities/user.entity';

/** Chạy mỗi lần khởi động: tạo admin + dữ liệu khoa/môn mẫu nếu DB còn trống */
@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);
  constructor(
    private readonly config: ConfigService,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Faculty) private readonly faculties: Repository<Faculty>,
    @InjectRepository(Subject) private readonly subjects: Repository<Subject>,
  ) {}

  async onApplicationBootstrap() {
    const email = (this.config.get('SEED_ADMIN_EMAIL') || 'admin@hub.local').toLowerCase();
    if (!(await this.users.exist({ where: { role: Role.ADMIN } }))) {
      await this.users.save(this.users.create({
        email, fullName: 'Quản trị viên', role: Role.ADMIN,
        passwordHash: await bcrypt.hash(this.config.get('SEED_ADMIN_PASSWORD') || 'Admin@123', 10),
      }));
      this.logger.log(`Đã tạo tài khoản admin: ${email}`);
    }

    if ((await this.faculties.count()) === 0) {
      const data: Record<string, { name: string; subjects: [string, string][] }> = {
        CNTT: { name: 'Công nghệ thông tin', subjects: [['IT101', 'Nhập môn lập trình'], ['IT201', 'Cấu trúc dữ liệu và giải thuật'], ['IT301', 'Cơ sở dữ liệu'], ['IT302', 'Mạng máy tính']] },
        KT: { name: 'Kinh tế', subjects: [['EC101', 'Kinh tế vi mô'], ['EC102', 'Kinh tế vĩ mô'], ['EC201', 'Nguyên lý kế toán']] },
        NN: { name: 'Ngoại ngữ', subjects: [['EN101', 'Tiếng Anh cơ bản'], ['EN201', 'Tiếng Anh chuyên ngành']] },
        KHCB: { name: 'Khoa học cơ bản', subjects: [['MA101', 'Giải tích 1'], ['MA102', 'Đại số tuyến tính'], ['PH101', 'Vật lý đại cương']] },
      };
      for (const [code, f] of Object.entries(data)) {
        const faculty = await this.faculties.save(this.faculties.create({ code, name: f.name }));
        await this.subjects.save(f.subjects.map(([c, n]) => this.subjects.create({ code: c, name: n, facultyId: faculty.id })));
      }
      this.logger.log('Đã tạo dữ liệu khoa/môn học mẫu');
    }
  }
}
