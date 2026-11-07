import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { DocumentEntity } from '../../documents/entities/document.entity';
import { User } from '../../users/entities/user.entity';

@Entity('reports')
export class Report {
  @PrimaryGeneratedColumn() id: number;
  @Column({ name: 'document_id', type: 'int' }) documentId: number;
  @ManyToOne(() => DocumentEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' }) document?: DocumentEntity;
  @Column({ name: 'reporter_id', type: 'int' }) reporterId: number;
  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reporter_id' }) reporter?: User;
  @Column({ type: 'varchar', length: 500 }) reason: string;
  @Column({ type: 'varchar', length: 10, default: 'OPEN' }) status: 'OPEN' | 'RESOLVED' | 'DISMISSED';
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
