import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Notice } from './entity/notice.entity';
import { Repository } from 'typeorm';

@Injectable()
export class NoticeService {
  constructor(
    @InjectRepository(Notice)
    private noticeRepository: Repository<Notice>,
  ) {}

  async getNoticeList(
    userId: string,
    page = 1,
    pageSize = 20,
    keyword?: string,
  ) {
    const plantShop = userId.slice(0, 5);
    const offset = (page - 1) * pageSize;

    // 공통 조건
    const base = this.noticeRepository
      .createQueryBuilder('n')
      .where('(n.plantShop = :plantShop OR n.plantShop IS NULL)', { plantShop })
      .andWhere('n.useYN = :useYN', { useYN: 'Y' })
      .andWhere('n.end_date > NOW()');

    if (keyword && keyword.trim() !== '') {
      base.andWhere('n.title LIKE :keyword', { keyword: `%${keyword}%` });
    }

    const items = await base
      .clone()
      .select([
        'n.id AS id',
        'n.title AS title',
        'n.updatedAt AS updatedAt',
        "COALESCE(n.plantShop, 'ALL_NOTICE') AS plantShop",
      ])
      .orderBy('n.updatedAt', 'DESC')
      .offset(offset)
      .limit(pageSize)
      .getRawMany<{
        id: number;
        title: string;
        updatedAt: Date;
        plantShop: string;
      }>();

    const total = await base.clone().getCount();
    const totalPages = pageSize > 0 ? Math.ceil(total / pageSize) : 0;

    return {
      items,
      page,
      pageSize,
      totalPages,
      hasNext: page * pageSize < total,
    };
  }

  noticeDetail(noticeId: number) {
    return this.noticeRepository
      .createQueryBuilder('n')
      .leftJoin('files', 'f', 'f.notice_id = n.id')
      .select([
        'n.title AS title',
        'n.content AS content',
        'n.updatedAt AS updatedAt',
        'f.todayDirPath AS filePath',
      ])
      .where('n.id = :noticeId', { noticeId })
      .getRawOne();
  }
}
