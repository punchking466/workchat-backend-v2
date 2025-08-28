import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

interface ChatMemberRequest extends Request {
  roomMember?: ChatMemberPayload;
}
export interface ChatMemberPayload {
  roomId: number;
  userId: string;
  isDeleted: boolean;
  rejoinedAt: Date | null;
}

export const ChatMember = createParamDecorator(
  (data: keyof ChatMemberPayload | undefined, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<ChatMemberRequest>();
    const cm = req.roomMember;
    return data ? cm?.[data] : cm;
  },
);
