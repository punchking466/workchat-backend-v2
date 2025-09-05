import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UserHandler } from './handlers/user.handler';
import { GroupChatService } from 'src/group-chat/group-chat.service';
import { PrivateChatService } from 'src/private-chat/private-chat.service';
import { forwardRef, Inject } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { parseRoomFromPath } from 'src/utils/parseRoomFromPath';

@WebSocketGateway({
  transports: ['websocket'],
  host: '0.0.0.0',
  maxHttpBufferSize: 1e8,
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  constructor(
    private userHandler: UserHandler,
    @Inject(forwardRef(() => GroupChatService))
    private groupChatService: GroupChatService,
    @Inject(forwardRef(() => PrivateChatService))
    private privateChatService: PrivateChatService,
    @InjectRedis() private redis: Redis,
  ) {}

  @WebSocketServer() server: Server;

  afterInit() {
    console.log('Socket');
  }
  async handleConnection(client: Socket) {
    await this.userHandler.handleConnection(client);
  }

  async handleDisconnect(client: Socket) {
    await this.userHandler.handleDisconnect(client);
  }

  sendToRoom(roomId: string, event: string, payload: any) {
    this.server.to(`room-${roomId}`).emit(event, payload);
  }

  async notifyUsersToRefresh(userIds: string[], event: string) {
    const socketIds = await Promise.all(
      userIds.map((userId) => this.userHandler.getSocketId(userId)),
    );
    socketIds.forEach((socketId) => {
      this.server.to(`${socketId}`).emit(event);
    });
  }

  async sendNotification(
    socketIds: {
      userId: string;
      socketId: string;
      allowSound: boolean;
      allowVibration: boolean;
    }[],
    payload: {
      id: number;
      title: string;
      sMsg: string;
      pushMsg?: string;
      roomType: 'G' | 'P';
    },
  ) {
    const pipe = this.redis.pipeline();
    for (const s of socketIds) pipe.get(`socket:${s.userId}:path`);
    const results = await pipe.exec();
    if (!results) {
      return;
    }

    for (let i = 0; i < socketIds.length; i++) {
      const s = socketIds[i];
      const path = results[i]?.[1] as string | null;
      const cur = parseRoomFromPath(path || '');
      const isSameRoom =
        (payload.roomType === 'G' &&
          cur.kind === 'group' &&
          Number(cur.roomId) === Number(payload.id)) ||
        (payload.roomType === 'P' &&
          cur.kind === 'private' &&
          Number(cur.roomId) === Number(payload.id));
      if (isSameRoom) continue;

      this.server.to(s.socketId).emit('notification', {
        ...payload,
        type: 0,
        allowSound: s.allowSound,
        allowVibration: s.allowVibration,
      });
    }
  }

  async emitToUser(userId: string, event: string, payload: any) {
    const socketId = await this.userHandler.getSocketId(userId);
    if (socketId) this.server.to(socketId).emit(event, payload);
  }

  @SubscribeMessage('init-unread')
  async initUnread(@ConnectedSocket() client: Socket) {
    await this.userHandler.getUnreadCount(client);

    return { success: true };
  }

  @SubscribeMessage('join-chat-room')
  async handleMessageChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() { type, roomId }: { type: string; roomId: number },
  ) {
    const result = await this.userHandler.getUserAndSocketIdFromClient(client);

    if (!result) return;

    await client.join(`room-${type}-${roomId}`);
    await this.privateChatService.updateReadLastMessage(result.userId, roomId);
    return { success: true };
  }

  @SubscribeMessage('join-group-room')
  async handleMessageGroup(
    @ConnectedSocket() client: Socket,
    @MessageBody() { type, roomId }: { type: string; roomId: number },
  ) {
    const result = await this.userHandler.getUserAndSocketIdFromClient(client);

    if (!result) return;

    await client.join(`room-${type}-${roomId}`);
    await this.groupChatService.updateReadLastMessage(result.userId, roomId);
    return { success: true };
  }

  @SubscribeMessage('read-message')
  async handleReadMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    { roomId, type }: { roomId: number; type: 'chat' | 'group' },
  ) {
    const result = await this.userHandler.getUserAndSocketIdFromClient(client);
    if (!result) return;

    if (type === 'chat') {
      await this.privateChatService.updateReadLastMessage(
        result.userId,
        roomId,
      );
    } else {
      await this.groupChatService.updateReadLastMessage(result.userId, roomId);
      return { success: true, roomId };
    }
  }

  @SubscribeMessage('path:update')
  async onPathUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { path: string },
  ) {
    await this.userHandler.setCurrentPath(client, data.path);
  }
}
