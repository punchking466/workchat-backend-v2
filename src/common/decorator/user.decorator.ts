import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    username: string;
    grade?: string;
  };
}

export interface UserPayload {
  id: string;
  username: string;
  grade?: string;
}

export const User = createParamDecorator(
  (
    data: keyof AuthenticatedRequest['user'] | undefined,
    ctx: ExecutionContext,
  ) => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return data ? request.user?.[data] : request.user;
  },
);
