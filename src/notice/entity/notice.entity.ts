import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('notice')
export class Notice {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({
    name: 'author',
    type: 'varchar',
    length: 255,
    comment: '작성자',
  })
  author: number;

  @Column({
    name: 'title',
    type: 'varchar',
    length: 255,
    comment: '제목',
  })
  title: string;

  @Column({
    name: 'content',
    type: 'text',
    comment: '본문',
  })
  content: string;

  @Column({
    name: 'useYN',
    type: 'varchar',
    length: 1,
  })
  useYN: string;

  @Column({
    name: 'image',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  image: string;

  @Column({
    name: 'plantShop',
    type: 'varchar',
    length: 5,
    comment: '공장번호 샵번호',
    default: 1,
    nullable: true,
  })
  plantShop: string;

  @Column({
    name: 'start_date',
    type: 'datetime',
  })
  startDate: Date;
  @Column({
    name: 'end_date',
    type: 'datetime',
  })
  end_date: Date;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;
}
