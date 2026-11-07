import { CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { DocumentEntity } from '../../documents/entities/document.entity';
import { User } from '../../users/entities/user.entity';

@Entity('bookmarks')
export class Bookmark {
  @PrimaryColumn({ name: 'user_id', type: 'int' }) userId: number;
  @PrimaryColumn({ name: 'document_id', type: 'int' }) documentId: number;
  @ManyToOne(() => User, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'user_id' }) user?: User;
  @ManyToOne(() => DocumentEntity, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'document_id' }) document?: DocumentEntity;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
