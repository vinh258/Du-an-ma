import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { NotificationType } from '../../../common/enums';
import { User } from '../../users/entities/user.entity';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn() id: number;
  @Column({ name: 'user_id', type: 'int' }) userId: number;
  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' }) user?: User;
  @Column({ type: 'varchar', length: 30 }) type: NotificationType;
  @Column({ type: 'json', nullable: true }) payload: Record<string, any> | null;
  @Column({ name: 'is_read', type: 'boolean', default: false }) isRead: boolean;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
