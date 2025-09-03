import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { NoticeService } from './notice.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { User, UserPayload } from 'src/common/decorator/user.decorator';

@ApiTags('Notice')
@Controller('notice')
export class NoticeController {
  constructor(private noticeService: NoticeService) {}

  @Get()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async list(
    @User() user: UserPayload,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 20,
    @Query('keyword') keyword = '',
  ) {
    const p = Number(page) || 1;
    const s = Math.min(Math.max(Number(pageSize) || 20, 1), 100); // 1~100 가드
    return this.noticeService.getNoticeList(user.id, p, s, keyword);
  }

  @Get('detail/:noticeId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: '공지사항',
    description: '',
  })
  async noticeDetail(@Param('noticeId') noticeId: number) {
    return this.noticeService.noticeDetail(noticeId);
  }
}
