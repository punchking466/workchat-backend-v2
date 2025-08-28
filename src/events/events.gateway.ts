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
    private groupChatService: GroupChatService,
    private privateChatService: PrivateChatService,
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

  sendNotification(
    socketIds: {
      userId: string;
      socketId: string;
      allowSound: boolean;
      allowVibration: boolean;
    }[],
    payload: any,
  ) {
    socketIds.forEach((socketId) => {
      this.server.to(`${socketId.socketId}`).emit('notification', {
        ...payload,
        allowSound: socketId.allowSound,
        allowVibration: socketId.allowVibration,
      });
    });
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
}
