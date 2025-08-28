import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Unique,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Unique(['blockedId'])
@Entity('block_users')
export class BlockUsers {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'blocker_id',
    type: 'int',
    comment: '차단자',
  })
  blockerId: number;

  @Column({
    name: 'blocked_id',
    type: 'int',
    comment: '차단대상자',
  })
  blockedId: number;

  @Column({
    name: 'user_status',
    type: 'varchar',
    length: 10,
    comment: '사용(해제):1, 미사용:0, 차단:2',
  })
  userStatus: string;

  @Column({
    name: 'blocked_at',
    type: 'datetime',
    comment: '차단일시',
    nullable: true,
  })
  blockedAt: string;

  @Column({
    name: 'unblocked_at',
    type: 'datetime',
    comment: '해제일시',
    nullable: true,
  })
  unblockedAt: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
