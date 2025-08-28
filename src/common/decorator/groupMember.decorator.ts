import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

interface GroupMemberRequest extends Request {
  groupMember?: GroupMemberPayload;
}
export interface GroupMemberPayload {
  groupId: number;
  userId: string;
  isAdmin: boolean;
  isDeleted: boolean;
  rejoinedAt: Date | null;
}

export const GroupMember = createParamDecorator(
  (data: keyof GroupMemberPayload | undefined, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<GroupMemberRequest>();
    const gm = req.groupMember;
    return data ? gm?.[data] : gm;
  },
);
