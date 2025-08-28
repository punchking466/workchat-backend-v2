import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('private_chat_message')
@Index(['roomId', 'messageOrder'])
export class PrivateChatMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text', nullable: true })
  message: string;

  @Column({ type: 'text', nullable: true })
  fileUpload: string;

  @Column({ type: 'enum', enum: ['text', 'card', 'image'], default: 'text' })
  type: string;

  @Column({ type: 'json', nullable: true })
  payload: {
    title: string;
    subtitle: string;
    text: string;
    buttons: { type: string; title: string; action: string }[];
    image: {
      url: string;
      alt: string;
    };
  };

  @CreateDateColumn({ type: 'datetime', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', precision: 6 })
  updatedAt: Date;

  @Column({ type: 'varchar', length: 100 })
  senderId: string;

  @Column()
  roomId: number;

  @Column({ default: 0 })
  messageOrder: number;
}
