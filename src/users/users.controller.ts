import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CreateUserDto, UpdateAllowNotificationDto } from './dto/users.dto';
import { UsersService } from './users.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from 'src/common/decorator/jwtPublic.decorator';
import { AuthGuard } from 'src/auth/auth.guard';
import { User, UserPayload } from 'src/common/decorator/user.decorator';

@ApiTags('유저관련')
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  @Public()
  @ApiOperation({
    summary: '유저 생성',
    description: '워크챗 유저 생성',
  })
  signUp(@Body() userInfo: CreateUserDto) {
    return this.usersService.createUser(userInfo);
  }

  @Get('/me/settings/notifications')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '사용자 알림 설정 가져오기',
  })
  getAllowNotification(@User() user: UserPayload) {
    return this.usersService.getAllowNotification(user.id);
  }

  @Put('/me/settings/notifications')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '사용자 알림 수정',
  })
  updateAllowNotification(
    @User() user: UserPayload,
    @Body() dto: UpdateAllowNotificationDto,
  ) {
    console.log(dto);
    return this.usersService.updateAllowNofication(user.id, dto);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: '유저 정보 조회',
    description: '특정 유저의 정보 조회',
  })
  @ApiParam({
    name: 'id',
    description: '유저 아이디',
    type: String,
  })
  findUserById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }
}
