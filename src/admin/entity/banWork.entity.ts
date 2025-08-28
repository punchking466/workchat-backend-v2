import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Unique,
  CreateDateColumn,
} from 'typeorm';

@Unique(['banWork'])
@Entity('ban_work')
export class BanWork {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'banWork',
    type: 'varchar',
    length: 20,
  })
  banWork: string;

  @Column({
    name: 'createdId',
    type: 'varchar',
    length: 20,
  })
  createdId: string;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;
}
