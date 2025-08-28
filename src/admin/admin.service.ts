import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BanWork } from './entity/banWork.entity';
import { Repository } from 'typeorm';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(BanWork)
    private banWordRepository: Repository<BanWork>,
  ) {}

  async getBanWord() {
    const banwords = await this.banWordRepository
      .createQueryBuilder()
      .select('banWork')
      .getRawMany();

    const banword = banwords.map((banword) => {
      return banword.banWork;
    });

    return banword;
  }
}
