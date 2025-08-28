import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { GroupChatService } from './group-chat.service';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    username: string;
    grade?: string;
  };
}

@Injectable()
export class GroupChatGuard implements CanActivate {
  constructor(
    private readonly groupChatService: GroupChatService,
    private readonly reflector: Reflector,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requireAdmin = this.reflector.get<boolean>(
      'requireGroupAdmin',
      context.getHandler(),
    );

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = request.user.id;
    const groupId = +request.params.roomId;
    const member = await this.groupChatService.getGroupUser(groupId, userId);

    if (!member) {
      throw new ForbiddenException('그룹 멤버가 아닙니다.');
    }

    if (requireAdmin && !member.isAdmin) {
      throw new ForbiddenException('관리자만 접근할 수 있습니다.');
    }

    request['groupMember'] = {
      groupId,
      userId,
      isAdmin: !!member.isAdmin,
      isDeleted: !!member.isDeleted,
      rejoinedAt: member.rejoinedAt ?? null,
    };
    return true;
  }
}
