import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Faculty } from './faculty.entity';

@Entity('subjects')
export class Subject {
  @PrimaryGeneratedColumn() id: number;
  @Column({ name: 'faculty_id', type: 'int' }) facultyId: number;
  @ManyToOne(() => Faculty, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'faculty_id' }) faculty: Faculty;
  @Column({ type: 'varchar', length: 20, unique: true }) code: string;
  @Column({ type: 'varchar', length: 200 }) name: string;
}
