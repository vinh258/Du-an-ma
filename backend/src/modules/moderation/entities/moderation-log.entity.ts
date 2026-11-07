import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { DocumentEntity } from '../../documents/entities/document.entity';
import { User } from '../../users/entities/user.entity';

@Entity('moderation_logs')
export class ModerationLog {
  @PrimaryGeneratedColumn() id: number;
  @Column({ name: 'document_id', type: 'int' }) documentId: number;
  @ManyToOne(() => DocumentEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' }) document?: DocumentEntity;
  @Column({ name: 'moderator_id', type: 'int' }) moderatorId: number;
  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'moderator_id' }) moderator?: User;
  @Column({ type: 'varchar', length: 10 }) action: 'APPROVE' | 'REJECT';
  @Column({ type: 'varchar', length: 500, nullable: true }) reason: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
