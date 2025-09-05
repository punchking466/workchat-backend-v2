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
import { GroupChatService } from './group-chat.service';
import { AuthGuard } from 'src/auth/auth.guard';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { User, UserPayload } from 'src/common/decorator/user.decorator';
import {
  AddUsersToGruop,
  CreateCardMessageDto,
  CreateGroupDto,
  CreateImageMessageDto,
  CreateTextMessageDto,
  NotificationDto,
} from './dto/group-chat.dto';
import { EventsGateway } from 'src/events/events.gateway';
import { GroupChatGuard } from './group-chat.guard';
import { RequireGroupAdmin } from 'src/common/decorator/require-group-admin.decorator';
import {
  GroupMember,
  GroupMemberPayload,
} from 'src/common/decorator/groupMember.decorator';
import { UsersService } from 'src/users/users.service';

@ApiTags('그룹채팅 관련')
@Controller('group-chat')
export class GroupChatController {
  constructor(
    private groupChatService: GroupChatService,
    private eventsGateway: EventsGateway,
    private usersService: UsersService,
  ) {}

  @Get('/rooms')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '그룹 채팅방 목록',
    description: '그룹 채팅방 목록 조회',
  })
  getGroupChatRooms(@User() user: UserPayload) {
    return this.groupChatService.getRoomLastMessages(user.id);
  }

  @Post('/rooms')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '그룹 채팅방 생성',
    description: '그룹 채팅방 생성',
  })
  createGroupRoom(
    @User() user: UserPayload,
    @Body() createGroupDto: CreateGroupDto,
  ) {
    return this.groupChatService.createGroupRoom(user.id, createGroupDto);
  }

  @Post('/message/text')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'text 발송',
    description: '특정 그룹채팅방에 텍스트 또는 이미지 발송',
  })
  async createTextMessage(
    @User() user: UserPayload,
    @Body() dto: CreateTextMessageDto,
  ) {
    const payload = await this.groupChatService.createTextMessage(user, dto);

    const receivers = (
      await this.groupChatService.getRoomUsers(dto.roomId)
    ).map((u) => u.contactId);

    const socketIds = await this.usersService.selectSocketId(
      receivers.filter((receiver) => receiver !== user.id),
    );

    await this.eventsGateway.sendNotification(socketIds, {
      id: payload.roomId,
      title: payload.senderName,
      sMsg: payload.message,
      pushMsg: payload.message,
      roomType: 'G',
    });

    this.eventsGateway.sendToRoom(
      `group-${dto.roomId}`,
      'new-message',
      payload,
    );

    await this.eventsGateway.notifyUsersToRefresh(
      receivers,
      'refresh-group-list',
    );
    await this.groupChatService.incUnreadForMessage(
      receivers,
      dto.roomId,
      user.id,
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
    const payload = await this.groupChatService.createImageMessage(user, dto);

    const receivers = (
      await this.groupChatService.getRoomUsers(dto.roomId)
    ).map((u) => u.contactId);

    const socketIds = await this.usersService.selectSocketId(
      receivers.filter((receiver) => receiver !== user.id),
    );

    await this.eventsGateway.sendNotification(socketIds, {
      id: payload.roomId,
      title: payload.senderName,
      sMsg: '새로운 이미지',
      pushMsg: '새로운 이미지',
      roomType: 'G',
    });

    this.eventsGateway.sendToRoom(
      `group-${dto.roomId}`,
      'new-message',
      payload,
    );

    await this.eventsGateway.notifyUsersToRefresh(
      receivers,
      'refresh-group-list',
    );

    await this.groupChatService.incUnreadForMessage(
      receivers,
      dto.roomId,
      user.id,
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
    const payload = await this.groupChatService.createCardMessage(user, dto);

    const receivers = (
      await this.groupChatService.getRoomUsers(dto.roomId)
    ).map((u) => u.contactId);

    const socketIds = await this.usersService.selectSocketId(
      receivers.filter((receiver) => receiver !== user.id),
    );

    await this.eventsGateway.sendNotification(socketIds, {
      id: payload.roomId,
      title: payload.senderName,
      sMsg: payload.payload.title || '새로운 카드 메세지',
      pushMsg: payload.payload.title || '새로운 카드 메세지',
      roomType: 'G',
    });

    this.eventsGateway.sendToRoom(
      `group-${dto.roomId}`,
      'new-message',
      payload,
    );

    await this.eventsGateway.notifyUsersToRefresh(
      receivers,
      'refresh-group-list',
    );

    await this.groupChatService.incUnreadForMessage(
      receivers,
      dto.roomId,
      user.id,
    );

    return { success: true };
  }

  @Post('/rooms/:roomId/users')
  @UseGuards(AuthGuard)
  @UseGuards(GroupChatGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '그룹채팅방 유저 추가',
    description: '그룹 채팅방 유저 추가',
  })
  async addUsersToGroup(
    @Param('roomId') roomId: number,
    @Body() dto: AddUsersToGruop,
  ) {
    await this.groupChatService.addUsersToGroup(roomId, dto.groupUsers);
    return { succes: true };
  }

  @Delete('/rooms/:roomId/leave')
  @UseGuards(AuthGuard, GroupChatGuard)
  @ApiOperation({ summary: '채팅방 나가기' })
  @ApiBearerAuth()
  async leaveGroup(@User() user: UserPayload, @Param('roomId') roomId: number) {
    await this.groupChatService.leaveGroup(user.id, roomId);
    return { success: true };
  }

  @Delete('/rooms/:roomId/users/:userId')
  @UseGuards(AuthGuard, GroupChatGuard)
  @RequireGroupAdmin()
  @ApiOperation({ summary: '유저 강제퇴장' })
  @ApiBearerAuth()
  async kickUser(
    @User() admin: UserPayload,
    @Param('roomId') roomId: number,
    @Param('userId') targetUserId: string,
  ) {
    await this.groupChatService.kickUser(admin.id, targetUserId, roomId);
    return { success: true };
  }

  @Get('/rooms/:roomId/details')
  @UseGuards(AuthGuard)
  @UseGuards(GroupChatGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '채팅방 정보 조회',
    description: '채팅방 및 유저 정보 조회',
  })
  async getRoomDetails(
    @User() user: UserPayload,
    @GroupMember() groupMember: GroupMemberPayload,
    @Param('roomId') roomId: number,
  ) {
    const roomInfo = await this.groupChatService.getRoomInfo(roomId);
    const roomUsers = await this.groupChatService.getRoomUsers(roomId);
    return {
      roomInfo,
      roomUsers,
      me: {
        userId: user.id,
        username: user.username,
        grade: user.grade,
        groupId: groupMember.groupId,
        isAdmin: groupMember.isAdmin,
        isDeleted: groupMember.isDeleted,
        rejoinedAt: groupMember.rejoinedAt,
      },
    };
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
    return this.groupChatService.getRoomNotification(user.id, roomId);
  }

  @Put('/rooms/:roomId/notification')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '알림 허용 변경',
    description: '알림 허용 여부 변경',
  })
  updateRoomNotification(
    @User() user: UserPayload,
    @Param('roomId') roomId: number,
    @Body() { allowNotification }: NotificationDto,
  ) {
    return this.groupChatService.updateRoomNotification(
      user.id,
      roomId,
      allowNotification,
    );
  }

  @Get('/rooms/:roomId/messages')
  @UseGuards(AuthGuard)
  @UseGuards(GroupChatGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '그룹채팅방 메세지 조회',
    description: '그룹 채팅방 메세지 조회 기본 10개',
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
    return this.groupChatService.getMessagesByRoomId(
      user.id,
      roomId,
      Number(page),
      Number(limit),
      keyword,
    );
  }
}
