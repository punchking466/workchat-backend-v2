import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('files')
export class Files {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({
    name: 'notice_id',
    type: 'bigint',
  })
  noticeId: number;

  @Column({
    name: 'todayDirPath',
    type: 'varchar',
    length: 255,
  })
  todayDirPath: string;

  @Column({
    name: 'storedFilename',
    type: 'varchar',
    length: 255,
  })
  storedFilename: string;

  @Column({
    name: 'originalFilename',
    type: 'varchar',
    length: 255,
  })
  originalFilename: string;

  @Column({
    name: 'file_kind',
    type: 'varchar',
    length: 100,
  })
  fileKind: string;

  @Column({
    name: 'file_size',
    type: 'int',
  })
  fileSize: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
