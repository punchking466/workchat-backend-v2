import { ApiProperty } from '@nestjs/swagger';

export class NoticeDto {
  @ApiProperty({ example: '1' })
  Notice_id: string;

  @ApiProperty({ example: 'test_admin' })
  Notice_author: string;

  @ApiProperty({ example: 'test1' })
  Notice_title: string;

  @ApiProperty({ example: '<p>test2</p>' })
  Notice_content: string;

  @ApiProperty({ example: 'Y' })
  Notice_useYN: string;

  @ApiProperty({ example: null, nullable: true })
  Notice_image: string | null;

  @ApiProperty({ example: '2024-06-25T00:33:35.000Z' })
  Notice_start_date: string;

  @ApiProperty({ example: '2024-06-25T00:33:35.000Z' })
  Notice_end_date: string;

  @ApiProperty({ example: '2024-06-25T00:33:35.000Z' })
  Notice_createdAt: string;

  @ApiProperty({ example: '2024-06-25T00:33:35.000Z' })
  Notice_updatedAt: string;
}

export class NoticeResponseDto {
  @ApiProperty({ example: 4 })
  length: number;

  @ApiProperty({ type: [NoticeDto] })
  notice: NoticeDto[];
}

export class NoticeList {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ example: 'test1' })
  title: string;

  @ApiProperty({ example: '2024-06-25T00:33:35.000Z' })
  updatedAt: string;
}

export class NoticeListResponseDto {
  @ApiProperty({ type: [NoticeList] })
  notice: NoticeList[];
}
