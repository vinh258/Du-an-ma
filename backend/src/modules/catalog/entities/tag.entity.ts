import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('tags')
export class Tag {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'varchar', length: 50, unique: true }) name: string;
  @Column({ type: 'varchar', length: 60, unique: true }) slug: string;
}
