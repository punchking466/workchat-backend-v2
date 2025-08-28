import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('groups')
export class Groups {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'name', type: 'varchar', default: 0 })
  name: string;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;

  @Column({ name: 'leave_group', type: 'tinyint', default: 1 })
  leave_group: boolean;

  @Column({ name: 'delete_group', type: 'tinyint', default: 1 })
  delete_group: boolean;

  @Column({ name: 'report_submission', type: 'tinyint', default: 1 })
  report_submission: number;
}
