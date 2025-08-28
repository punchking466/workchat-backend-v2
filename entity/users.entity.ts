import { Entity, PrimaryColumn, Column, Index } from 'typeorm';

@Entity('users')
@Index('idx_plant_shop', ['plantShop'])
export class Users {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  WORKCHATID: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  QB05NAME: string;

  @Column({ type: 'char', length: 1, nullable: true })
  QB05AUTH: string;

  @Column({ type: 'char', length: 1, default: '6' })
  QB05PLNT: string;

  @Column({ type: 'varchar', length: 5, nullable: true })
  plantShop: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  QB05FILE: string;

  @Column({ type: 'char', length: 1, nullable: true })
  QB05BLFG: string;

  @Column({ type: 'char', length: 1, default: 'N' })
  QB05DLFG: string;

  @Column({ type: 'char', length: 1, default: '' })
  QB05GRUP: string;

  @Column({ type: 'varchar', length: 8, nullable: true })
  QB05MENU: string;

  @Column({ type: 'char', length: 1, nullable: true })
  QB05DEPT: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  socketId: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  QB05GRAD: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  QB05AUTHNM: string;

  @Column({ type: 'tinyint', default: 1 })
  allowNotification: boolean;

  @Column({ type: 'tinyint', default: 1 })
  allowSound: boolean;

  @Column({ type: 'tinyint', default: 1 })
  allowVibration: boolean;

  @Column({ type: 'enum', enum: ['S', 'M', 'L'], default: 'M' })
  fontSize: string;
}
