import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../users/entities/user.entity';

@Entity('audit_logs')
@Index(['action', 'createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn() id: number;
  @Column({ name: 'actor_id', type: 'int', nullable: true }) actorId: number | null;
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actor_id' }) actor?: User | null;
  @Column({ type: 'varchar', length: 40 }) action: string;
  @Column({ name: 'target_type', type: 'varchar', length: 30, nullable: true }) targetType: string | null;
  @Column({ name: 'target_id', type: 'int', nullable: true }) targetId: number | null;
  @Column({ type: 'varchar', length: 500, nullable: true }) detail: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
