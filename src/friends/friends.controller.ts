import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { User, UserPayload } from 'src/common/decorator/user.decorator';
import { UsersService } from 'src/users/users.service';

@ApiTags('친구관련')
@Controller('friends')
export class FriendsController {
  constructor(private usersService: UsersService) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({
    summary: '친구목록',
    description: '같은 공장의 친구목록',
  })
  @ApiQuery({
    name: 'keyword',
    description: '찾는 유저 이름 (없으면 전체 유저)',
    required: false,
    type: String,
  })
  async getMyFriends(
    @User() user: UserPayload,
    @Query('keyword') keyword?: string,
  ) {
    return this.usersService.getFriendsByUserId(user.id, keyword);
  }
}
