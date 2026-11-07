import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { DocumentEntity } from '../../documents/entities/document.entity';
import { User } from '../../users/entities/user.entity';

@Entity('comments')
export class Comment {
  @PrimaryGeneratedColumn() id: number;
  @Column({ name: 'document_id', type: 'int' }) documentId: number;
  @ManyToOne(() => DocumentEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' }) document?: DocumentEntity;
  @Column({ name: 'user_id', type: 'int' }) userId: number;
  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' }) user?: User;
  @Column({ name: 'parent_id', type: 'int', nullable: true }) parentId: number | null;
  @ManyToOne(() => Comment, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_id' }) parent?: Comment | null;
  @Column({ type: 'varchar', length: 2000 }) content: string;
  @Column({ name: 'is_deleted', type: 'boolean', default: false }) isDeleted: boolean;
  @Column({ name: 'edited_at', type: 'datetime', nullable: true }) editedAt: Date | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
