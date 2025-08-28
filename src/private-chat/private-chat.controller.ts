import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PrivateChatService } from './private-chat.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/auth.guard';
import { User, UserPayload } from 'src/common/decorator/user.decorator';
import {
  CreateCardMessageDto,
  CreateImageMessageDto,
  CreateRoomDto,
  CreateTextMessageDto,
  NotificationDto,
} from './dto/private-chat.dto';
import { EventsGateway } from 'src/events/events.gateway';
import { UsersService } from 'src/users/users.service';
import { PrivateChatGuard } from './private-chat.guard';

@ApiTags('1:1채팅 관련')
@Controller('private-chat')
export class PrivateChatController {
  constructor(
    private privateChatService: PrivateChatService,
    private usersService: UsersService,
    private eventsGateway: EventsGateway,
  ) {}

  @Post('/create')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '1:1 채팅방 생성',
    description: 'roomId 미존재시 생성, 존재시 기존 roomId return',
  })
  createChatRoom(
    @User() user: UserPayload,
    @Body() createRoomDto: CreateRoomDto,
  ) {
    return this.privateChatService.createOrGetPrivateRoom(
      user.id,
      createRoomDto.friendId,
    );
  }

  @Post('/message/text')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'text 발송',
    description: '특정 채팅방에 텍스트  발송',
  })
  async createTextOrImageMessage(
    @User() user: UserPayload,
    @Body() dto: CreateTextMessageDto,
  ) {
    const payload = await this.privateChatService.createTextMessage(user, dto);

    const receivers = (
      await this.privateChatService.getRoomUsers(dto.roomId)
    ).map((u) => u.contactId);

    const socketIds = await this.usersService.selectSocketId(receivers);

    this.eventsGateway.sendNotification(socketIds, {
      id: payload.id,
      title: payload.senderName,
      sMsg: payload.message,
      roomType: 'P',
    });

    this.eventsGateway.sendToRoom(`chat-${dto.roomId}`, 'new-message', payload);
    await this.eventsGateway.notifyUsersToRefresh(
      receivers,
      'refresh-chat-list',
    );
    return payload;
  }

  @Post('/message/image')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '이미지 발송',
    description: '특정 그룹채팅방에 이미지 발송',
  })
  async createImageMessage(
    @User() user: UserPayload,
    @Body() dto: CreateImageMessageDto,
  ) {
    const payload = await this.privateChatService.createImageMessage(user, dto);

    const receivers = (
      await this.privateChatService.getRoomUsers(dto.roomId)
    ).map((u) => u.contactId);

    const socketIds = await this.usersService.selectSocketId(receivers);

    this.eventsGateway.sendNotification(socketIds, {
      id: payload.roomId,
      title: payload.senderName,
      sMsg: '새로운 이미지',
      roomType: 'P',
    });

    this.eventsGateway.sendToRoom(`chat-${dto.roomId}`, 'new-message', payload);

    await this.eventsGateway.notifyUsersToRefresh(
      receivers,
      'refresh-group-list',
    );

    return payload;
  }

  @Post('/message/card')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '카드메세지 발송',
    description: '특정 채팅방에 카드메시지 발송',
  })
  async createCardMessage(
    @User() user: UserPayload,
    @Body() dto: CreateCardMessageDto,
  ) {
    const payload = await this.privateChatService.createCardMessage(user, dto);

    const receivers = (
      await this.privateChatService.getRoomUsers(dto.roomId)
    ).map((u) => u.contactId);

    const socketIds = await this.usersService.selectSocketId(receivers);

    this.eventsGateway.sendNotification(socketIds, {
      id: payload.roomId,
      title: payload.senderName,
      sMsg: payload.payload.title || '새로운 카드 메세지',
      roomType: 'P',
    });

    this.eventsGateway.sendToRoom(`chat-${dto.roomId}`, 'new-message', payload);
    await this.eventsGateway.notifyUsersToRefresh(
      receivers,
      'refresh-chat-list',
    );
    return { success: true };
  }

  @Get('/rooms')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '채팅방 목록',
    description: '내 채팅방 목록 조회',
  })
  async getMyChatRooms(@User() user: UserPayload) {
    return this.privateChatService.getRoomLastMessages(user.id);
  }

  @Get('/rooms/:roomId/details')
  @UseGuards(AuthGuard, PrivateChatGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '채팅방 유저 정보 조회',
    description: '채팅방 유저 정보 조회',
  })
  async enterRoom(@User() user: UserPayload, @Param('roomId') roomId: number) {
    const roomUsers = await this.privateChatService.roomUsers(user.id, roomId);
    return {
      me: {
        userId: user.id,
        username: user.username,
        grade: user.grade,
      },
      roomUsers,
    };
  }

  @Delete('/rooms/:roomId/leave')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: '채팅방 나가기' })
  @ApiBearerAuth()
  async leaveGroup(@User() user: UserPayload, @Param('roomId') roomId: number) {
    await this.privateChatService.leaveGroup(user.id, roomId);
    return { success: true };
  }

  @Get('/rooms/:roomId/notification')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '알림 허용 조회',
    description: '채팅방 알림 허용 조회',
  })
  getRoomNotification(
    @User() user: UserPayload,
    @Param('roomId') roomId: number,
  ) {
    return this.privateChatService.getRoomNotification(user.id, roomId);
  }

  @Put('/rooms/:roomId/notification')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '알림 허용 변경',
    description: '알림 허용 여부 변경',
  })
  async updateRoomNotification(
    @User() user: UserPayload,
    @Param('roomId') roomId: number,
    @Body() { allowNotification }: NotificationDto,
  ) {
    return this.privateChatService.updateRoomNotification(
      user.id,
      roomId,
      allowNotification,
    );
  }

  @Get('/rooms/:roomId/messages')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '채팅방 메세지 조회',
    description: '채팅방 메세지 조회 기본 10개',
  })
  @ApiQuery({
    name: 'page',
    type: Number,
    required: false,
    description: 'Page number default 1',
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    required: false,
    description: 'Page number default 20',
  })
  @ApiQuery({
    name: 'keyword',
    type: String,
    required: false,
    description: 'Search Keyword',
  })
  getMessagesByRoomId(
    @User() user: UserPayload,
    @Param('roomId') roomId: number,
    @Query('page') page = 1,
    @Query('limit') limit = 5,
    @Query('keyword') keyword: string,
  ) {
    return this.privateChatService.getMessagesByRoomId(
      user.id,
      roomId,
      Number(page),
      Number(limit),
      keyword,
    );
  }

  @Get(':friendId')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '1:1 roomId 조회',
    description: '1:1 roomId 조회',
  })
  getRoomId(@User() user: UserPayload, @Param('friendId') friendId: string) {
    return this.privateChatService.findRoomId(user.id, friendId);
  }
}
