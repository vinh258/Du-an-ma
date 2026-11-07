import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('document_downloads')
export class DocumentDownload {
  @PrimaryGeneratedColumn() id: number;
  @Column({ name: 'document_id', type: 'int' }) documentId: number;
  @Column({ name: 'user_id', type: 'int', nullable: true }) userId: number | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
