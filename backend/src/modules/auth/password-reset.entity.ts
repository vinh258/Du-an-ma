import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('password_resets')
export class PasswordReset {
  @PrimaryGeneratedColumn() id: number;
  @Column({ name: 'user_id', type: 'int' }) userId: number;
  @Column({ name: 'token_hash', type: 'char', length: 64 }) tokenHash: string;
  @Column({ name: 'expires_at', type: 'datetime' }) expiresAt: Date;
  @Column({ name: 'used_at', type: 'datetime', nullable: true }) usedAt: Date | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
