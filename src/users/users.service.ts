import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Users } from './users.entity';
import { DataSource, Repository } from 'typeorm';
import { CreateUserDto, UpdateAllowNotificationDto } from './dto/users.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Users)
    private usersRepository: Repository<Users>,
    private dataSource: DataSource,
  ) {}
  async createUser(createUserDto: CreateUserDto) {
    await this.usersRepository.save(createUserDto);
    return createUserDto;
  }

  async findById(id: string) {
    return await this.usersRepository.findOneBy({ id: id });
  }

  async getFriendsByUserId(userId: string, keyword?: string) {
    const qb = this.usersRepository
      .createQueryBuilder('u')
      .where((qb) => {
        const subQuery = qb
          .subQuery()
          .select('subUser.plantShop')
          .from('users', 'subUser')
          .where('subUser.id = :userId')
          .andWhere('subUser.is_delete = "N"')
          .getQuery();

        return 'u.plantShop = ' + subQuery;
      })
      .andWhere('u.id != :userId', { userId })
      .andWhere('u.is_delete = "N"');
    if (keyword) {
      qb.andWhere('u.username LIKE :searchUser', {
        searchUser: `%${keyword}%`,
      });
    }

    return await qb.getMany();
  }

  async updateSocketId(userId: string, socketId: string | null) {
    await this.dataSource.transaction(async (manager) => {
      const usersRepo = manager.getRepository(Users);

      await usersRepo.update({ id: userId }, { socketId });
    });
  }

  selectSocketId(users: string[]): Promise<
    {
      userId: string;
      socketId: string;
      allowSound: boolean;
      allowVibration: boolean;
    }[]
  > {
    return this.usersRepository
      .createQueryBuilder('u')
      .select([
        'u.id AS userId',
        'u.socketId AS socketId',
        'u.allowSound AS allowSound',
        'u.allowVibration AS allowVibration',
      ])
      .where('u.id IN(:...users)', { users })
      .andWhere('allowNotification = true')
      .andWhere('socketId IS NOT NULL')
      .getRawMany();
  }

  getAllowNotification(userId: string) {
    return this.usersRepository
      .createQueryBuilder('u')
      .select([
        'u.allowNotification as allowNotification',
        'u.allowSound as allowSound',
        'u.allowVibration as allowVibration',
      ])
      .where('u.id = :userId', { userId })
      .getRawOne();
  }

  async updateAllowNofication(userId: string, dto: UpdateAllowNotificationDto) {
    await this.dataSource.transaction(async (manager) => {
      const usersRepo = manager.getRepository(Users);

      await usersRepo.update(
        { id: userId },
        {
          allowNotification: dto.allowNotification,
          allowSound: dto.allowSound,
          allowVibration: dto.allowVibration,
        },
      );
    });
  }
}
