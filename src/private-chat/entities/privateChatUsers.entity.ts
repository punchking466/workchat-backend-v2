import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('private_chat_users')
@Index(['roomId', 'contactId'])
export class PrivateChatUsers {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn({ type: 'datetime', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', precision: 6 })
  updatedAt: Date;

  @Column()
  roomId: number;

  @Column({ type: 'varchar', length: 100 })
  contactId: string;

  @Column({ default: false })
  isDeleted: boolean;

  @Column({ type: 'timestamp', nullable: true })
  leftAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  rejoinedAt: Date | null;

  @Column({ default: 0 })
  lastReadMessageOrder: number;

  @Column({ type: 'tinyint', default: 1 })
  allowNotification: boolean;
}
