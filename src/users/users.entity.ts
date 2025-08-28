import { Entity, Column, PrimaryColumn, Index } from 'typeorm';
import { FontType } from './type/fontType';

@Entity()
export class Users {
  @PrimaryColumn({
    name: 'WORKCHATID',
    type: 'varchar',
    length: 100,
    comment: '검사자사번',
  })
  id: string;

  @Column({
    name: 'QB05NAME',
    type: 'varchar',
    length: 30,
    comment: '검사원이름',
    nullable: true,
  })
  username: string;

  @Column({
    name: 'QB05AUTH',
    type: 'char',
    length: 1,
    comment: '부서 (K : 조립,Q : 도장, P : 품질)',
    nullable: true,
  })
  auth: string;

  @Column({
    name: 'plantShop',
    type: 'varchar',
    length: 5,
    comment: '공장번호 샵번호',
    default: 1,
    nullable: true,
  })
  plantShop: string;

  @Index()
  @Column({
    name: 'QB05PLNT',
    type: 'char',
    length: 1,
    comment: '공장구분',
    default: 1,
    nullable: true,
  })
  plant: string;

  @Column({
    name: 'QB05FILE',
    type: 'varchar',
    length: 200,
    comment: '검사원사진파일',
    nullable: true,
  })
  profileImage: string;

  @Column({
    name: 'QB05DLFG',
    type: 'char',
    length: 1,
    comment: '삭제구분',
    default: 'N',
    nullable: true,
  })
  is_delete: string;

  @Column({
    name: 'QB05GRUP',
    type: 'char',
    length: 1,
    comment:
      'A(관리자), G(그룹장), P(파트장), S(주임), O(사무실), U(일반사용자), D(개발자)',
    default: '',
    nullable: true,
  })
  position: string;

  @Column({
    name: 'QB05MENU',
    type: 'varchar',
    length: 8,
    comment: 'AUTH_ID 사용자권한(MENU_ID 아님)',
    nullable: true,
  })
  menu: string;

  @Column({
    name: 'QB05DEPT',
    type: 'char',
    length: 1,
    comment: '사용자부서(W2)',
    nullable: true,
  })
  department: string;

  @Column({
    name: 'QB05GRAD',
    type: 'varchar',
    length: 50,
    comment: '직급',
    nullable: true,
  })
  grade: string;

  @Column({
    name: 'QB05AUTHNM',
    type: 'varchar',
    length: 100,
    comment: '공정명',
    nullable: true,
  })
  authName: string;

  @Column({ type: 'varchar', nullable: true })
  socketId: string | null;

  @Column({
    name: 'allowNotification',
    type: 'tinyint',
    comment: '알림허용여부',
    default: 1,
  })
  allowNotification: boolean;

  @Column({
    name: 'allowSound',
    type: 'tinyint',
    comment: '알림소리허용여부',
    default: 1,
  })
  allowSound: boolean;

  @Column({
    name: 'allowVibration',
    type: 'tinyint',
    comment: '알림진동허용여부',
    default: 1,
  })
  allowVibration: boolean;

  @Column({
    type: 'enum',
    enum: FontType,
    default: FontType.MEDIUM,
    comment: '폰트 크기 S, M, L',
  })
  fontSize: FontType;
}
