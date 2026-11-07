import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('reputation_logs')
export class ReputationLog {
  @PrimaryGeneratedColumn() id: number;
  @Column({ name: 'user_id', type: 'int' }) userId: number;
  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' }) user?: User;
  @Column({ type: 'int' }) delta: number;
  @Column({ type: 'varchar', length: 40 }) reason: string;
  @Column({ name: 'ref_document_id', type: 'int', nullable: true }) refDocumentId: number | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
