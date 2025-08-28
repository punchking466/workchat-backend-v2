import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

export enum LeaveType {
  SELF = 'SELF',
  KICK = 'KICK',
}

@Entity('group_users')
@Unique(['groupId', 'contactId'])
export class GroupUsers {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'tinyint', default: 0 })
  isAdmin: boolean;

  @CreateDateColumn({ type: 'datetime', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', precision: 6 })
  updatedAt: Date;

  @Column()
  groupId: number;

  @Column({ type: 'varchar', length: 100 })
  contactId: string;

  @Column({ default: false })
  isDeleted: boolean;

  @Column({ type: 'enum', enum: LeaveType, nullable: true })
  leaveType: LeaveType | null;

  @Column({ type: 'varchar', nullable: true })
  kickedBy: string | null;

  @Column({ type: 'timestamp', nullable: true })
  leftAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  rejoinedAt: Date | null;

  @Column({ default: 0 })
  lastReadMessageOrder: number;

  @Column({ type: 'tinyint', default: 1 })
  allowNotification: boolean;
}
