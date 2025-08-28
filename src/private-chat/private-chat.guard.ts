import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrivateChatService } from './private-chat.service';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    username: string;
    grade?: string;
  };
}

@Injectable()
export class PrivateChatGuard implements CanActivate {
  constructor(private readonly privaetChatService: PrivateChatService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = request.user.id;
    const roomId = +request.params.roomId;
    const member = await this.privaetChatService.getRoomUser(roomId, userId);

    if (!member) {
      throw new ForbiddenException('그룹 멤버가 아닙니다.');
    }
    console.log(member);
    request['roomMember'] = {
      roomId,
      userId,
      isDeleted: !!member.isDeleted,
      rejoinedAt: member.rejoinedAt ?? null,
    };
    return true;
  }
}
