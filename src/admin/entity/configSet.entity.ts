import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('config_set')
export class ConfigSet {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'title',
    type: 'varchar',
    length: 20,
  })
  title: string;

  @Column({
    name: 'logo',
    type: 'varchar',
    length: 255,
  })
  logo: string;

  @Column({
    name: 'emoticon',
    type: 'varchar',
    length: 1,
  })
  emoticon: string;

  @Column({
    name: 'fileShare',
    type: 'varchar',
    length: 1,
  })
  fileShare: string;

  @Column({
    name: 'charAccept',
    type: 'varchar',
    length: 1,
  })
  charAccept: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
