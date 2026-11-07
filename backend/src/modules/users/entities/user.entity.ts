import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Role } from '../../../common/enums';
import { Faculty } from '../../catalog/entities/faculty.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'varchar', length: 255, unique: true }) email: string;
  @Column({ name: 'password_hash', type: 'varchar', length: 255, select: false }) passwordHash: string;
  @Column({ name: 'full_name', type: 'varchar', length: 150 }) fullName: string;
  @Column({ name: 'avatar_url', type: 'varchar', length: 500, nullable: true }) avatarUrl: string | null;
  @Column({ name: 'student_code', type: 'varchar', length: 30, nullable: true }) studentCode: string | null;
  @Column({ name: 'faculty_id', type: 'int', nullable: true }) facultyId: number | null;
  @ManyToOne(() => Faculty, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'faculty_id' }) faculty?: Faculty | null;
  @Column({ type: 'varchar', length: 10, default: Role.STUDENT }) role: Role;
  @Column({ name: 'reputation_score', type: 'int', default: 0 }) reputationScore: number;
  @Column({ type: 'varchar', length: 10, default: 'ACTIVE' }) status: 'ACTIVE' | 'BANNED';
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
