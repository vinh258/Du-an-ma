import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';
import { DocumentEntity } from '../../documents/entities/document.entity';
import { User } from '../../users/entities/user.entity';

@Entity('ratings')
@Unique(['documentId', 'userId'])
export class Rating {
  @PrimaryGeneratedColumn() id: number;
  @Column({ name: 'document_id', type: 'int' }) documentId: number;
  @ManyToOne(() => DocumentEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' }) document?: DocumentEntity;
  @Column({ name: 'user_id', type: 'int' }) userId: number;
  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' }) user?: User;
  @Column({ type: 'tinyint' }) score: number;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
