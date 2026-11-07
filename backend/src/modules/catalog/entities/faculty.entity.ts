import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('faculties')
export class Faculty {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'varchar', length: 150, unique: true }) name: string;
  @Column({ type: 'varchar', length: 20, unique: true }) code: string;
}
