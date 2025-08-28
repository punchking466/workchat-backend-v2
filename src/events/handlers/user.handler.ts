import { InjectRedis } from '@nestjs-modules/ioredis';
import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import Redis from 'ioredis';
import { Socket } from 'socket.io';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class UserHandler {
  constructor(
    @InjectRedis() private redis: Redis,
    private jwtService: JwtService,
    private usersService: UsersService,
  ) {}

  private logger = new Logger();

  async handleConnection(client: Socket) {
    const token = client.handshake.auth.token as string;
    const clientType = client.handshake.query.clientType;
    const mobileToken = client.handshake.query.accessToken as string;

    if (clientType === 'mobile') {
      const decodeToken = await this.verifyToken(mobileToken);
      if (!decodeToken) return;
      await this.usersService.updateSocketId(decodeToken.id, client.id);
    }

    const decode = await this.verifyToken(token);

    if (!decode) return;

    await this.redis.set(`user:socket:${decode.id}`, client.id);
  }

  async handleDisconnect(client: Socket) {
    const token = client.handshake.auth.token as string;
    const clientType = client.handshake.query.clientType;
    const mobileToken = client.handshake.query.accessToken as string;

    if (clientType === 'mobile') {
      const decodeToken = await this.verifyToken(mobileToken);
      if (!decodeToken) return;
      await this.usersService.updateSocketId(decodeToken.id, null);
    }

    const decode = await this.verifyToken(token);

    if (!decode) return;

    await this.redis.del(`user:socket:${decode.id}`);
  }

  async getUserAndSocketIdFromClient(
    client: Socket,
  ): Promise<{ userId: string; socketId: string } | null> {
    const token = client.handshake.auth.token as string;
    const decode = await this.verifyToken(token);

    if (!decode) return null;

    const socketId = await this.getSocketId(decode.id);
    if (!socketId) return null;

    return { userId: decode.id, socketId };
  }

  async getSocketId(userId: string): Promise<string | null> {
    const socketId = await this.redis.get(`user:socket:${userId}`);
    return socketId || null;
  }

  private async verifyToken(
    token: string,
  ): Promise<{ id: string; username: string; grade: string } | null> {
    if (!token) return null;

    try {
      await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });

      return this.jwtService.decode(token);
    } catch (error) {
      this.logger.log(error);
      return null;
    }
  }
}
