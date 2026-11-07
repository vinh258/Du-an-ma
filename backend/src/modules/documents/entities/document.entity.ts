import { Column, CreateDateColumn, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { DocumentStatus } from '../../../common/enums';
import { Subject } from '../../catalog/entities/subject.entity';
import { Tag } from '../../catalog/entities/tag.entity';
import { User } from '../../users/entities/user.entity';

const num = { to: (v: number) => v, from: (v: string | number) => (v === null || v === undefined ? v : Number(v)) };

@Entity('documents')
export class DocumentEntity {
  @PrimaryGeneratedColumn() id: number;

  @Column({ name: 'uploader_id', type: 'int' }) uploaderId: number;
  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'uploader_id' }) uploader: User;

  @Column({ name: 'subject_id', type: 'int' }) subjectId: number;
  @ManyToOne(() => Subject, { nullable: false })
  @JoinColumn({ name: 'subject_id' }) subject: Subject;

  @Column({ type: 'varchar', length: 255 }) title: string;
  @Column({ type: 'text', nullable: true }) description: string | null;
  /** Text trích xuất từ file, dùng cho full-text search (không trả về mặc định) */
  @Column({ name: 'content_text', type: 'longtext', nullable: true, select: false }) contentText: string | null;

  @Column({ name: 'ai_summary', type: 'text', nullable: true }) aiSummary: string | null;

  @Column({ name: 'file_key', type: 'varchar', length: 500 }) fileKey: string;
  @Column({ name: 'file_name', type: 'varchar', length: 255 }) fileName: string;
  @Column({ name: 'file_size', type: 'bigint', transformer: num }) fileSize: number;
  @Column({ name: 'mime_type', type: 'varchar', length: 100 }) mimeType: string;
  @Column({ name: 'file_hash', type: 'char', length: 64, unique: true }) fileHash: string;

  @Column({ type: 'varchar', length: 10, default: DocumentStatus.PENDING }) status: DocumentStatus;
  @Column({ name: 'reject_reason', type: 'varchar', length: 500, nullable: true }) rejectReason: string | null;
  @Column({ name: 'reviewed_by', type: 'int', nullable: true }) reviewedById: number | null;
  @Column({ name: 'reviewed_at', type: 'datetime', nullable: true }) reviewedAt: Date | null;

  @Column({ name: 'view_count', type: 'int', default: 0 }) viewCount: number;
  @Column({ name: 'download_count', type: 'int', default: 0 }) downloadCount: number;
  @Column({ name: 'rating_avg', type: 'decimal', precision: 3, scale: 2, default: 0, transformer: num }) ratingAvg: number;
  @Column({ name: 'rating_count', type: 'int', default: 0 }) ratingCount: number;

  @ManyToMany(() => Tag)
  @JoinTable({ name: 'document_tags', joinColumn: { name: 'document_id' }, inverseJoinColumn: { name: 'tag_id' } })
  tags: Tag[];

  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
