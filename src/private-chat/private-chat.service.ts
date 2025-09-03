import { InjectRepository } from '@nestjs/typeorm';
import {
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrivateChatRoom } from 'src/private-chat/entities/privateChatRoom.entity';
import { PrivateChatUsers } from 'src/private-chat/entities/privateChatUsers.entity';
import { UsersService } from 'src/users/users.service';
import { DataSource, Repository } from 'typeorm';
import {
  CreateCardMessageDto,
  CreateImageMessageDto,
  CreateTextMessageDto,
} from './dto/private-chat.dto';
import { PrivateChatMessage } from './entities/privateChatMessage.entity';
import { UserPayload } from 'src/common/decorator/user.decorator';
import { saveImage } from 'src/utils/endecodeImage';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { EventsGateway } from 'src/events/events.gateway';

@Injectable()
export class PrivateChatService {
  constructor(
    @InjectRedis() private readonly redis: Redis,
    @InjectRepository(PrivateChatRoom)
    private pChatRoomRepository: Repository<PrivateChatRoom>,
    @InjectRepository(PrivateChatUsers)
    private pChatUserRepository: Repository<PrivateChatUsers>,
    @InjectRepository(PrivateChatMessage)
    private pChatMessageRepository: Repository<PrivateChatMessage>,
    private usersService: UsersService,
    private dataSource: DataSource,
    @Inject(forwardRef(() => EventsGateway))
    private readonly eventsGateway: EventsGateway,
  ) {}

  private unreadHashKey = (uid: string) => `user:${uid}:private:unread`;
  private unreadTotalKey = (uid: string) => `user:${uid}:private:unread:total`;

  findRoomId(userId: string, friendId: string) {
    return this.pChatUserRepository
      .createQueryBuilder('pcu1')
      .select('roomId')
      .where((qb) => {
        const subQuery = qb
          .subQuery()
          .select('pcu2.roomId')
          .from(PrivateChatUsers, 'pcu2')
          .where('pcu2.contactId = :friendId', { friendId })
          .getQuery();
        return 'pcu1.roomId =' + subQuery;
      })
      .andWhere('pcu1.contactId = :userId', { userId })
      .getRawOne();
  }

  /**
   * 특정 유저와 친구 간의 1:1 채팅방을 생성하거나 기존 채팅방을 반환합니다.
   *
   * - 채팅방이 이미 존재하면 해당 roomId를 반환
   * - 채팅방이 없다면 새로 생성 후 두 유저를 참여자로 추가
   *
   * @param userId 현재 로그인한 유저 ID
   * @param friendId 상대 유저 ID
   * @returns roomId
   */
  async createOrGetPrivateRoom(
    userId: string,
    friendId: string,
  ): Promise<{ roomId: number }> {
    const friend = await this.usersService.findById(friendId);

    if (!friend) throw new NotFoundException();

    const existringRoom = await this.getPrivateRoomIfExists(userId, friendId);

    return this.dataSource.transaction(async (manager) => {
      const roomRepo = manager.getRepository(PrivateChatRoom);
      const userRepo = manager.getRepository(PrivateChatUsers);
      const msgRepo = manager.getRepository(PrivateChatMessage);
      if (existringRoom) {
        await this.rejoinIfDeleted(existringRoom.roomId, userRepo, msgRepo);
        return existringRoom;
      }

      const { id: roomId } = await this.createPrivateRoom(roomRepo);

      await this.addUserToRoom(roomId, userId, userRepo);
      await this.addUserToRoom(roomId, friendId, userRepo);
      return { roomId: roomId };
    });
  }

  async warmUnreadPrivteCache(userId: string) {
    await this.redis.del(
      this.unreadHashKey(userId),
      this.unreadTotalKey(userId),
    );

    const rows = await this.pChatUserRepository
      .createQueryBuilder('pu')
      .leftJoin(
        (qb) =>
          qb
            .from(PrivateChatMessage, 'pm')
            .select('pm.roomId', 'gid')
            .addSelect('MAX(pm.messageOrder)', 'lastOrder')
            .groupBy('pm.roomId'),
        'L',
        'L.gid = pu.roomId',
      )
      .where('pu.contactId = :uid', { uid: userId })
      .andWhere('pu.isDeleted = false')
      .select([
        'pu.roomId AS roomId',
        'GREATEST(COALESCE(L.lastOrder, 0) - pu.lastReadMessageOrder, 0) AS unread',
      ])
      .getRawMany<{ roomId: number; unread: number }>();

    const pipe = this.redis.pipeline();
    let total = 0;
    for (const r of rows) {
      pipe.hset(this.unreadHashKey(userId), String(r.roomId), Number(r.unread));
      total += Number(r.unread);
    }
    pipe.set(this.unreadTotalKey(userId), total);
    await pipe.exec();
    return {
      perRoom: rows,
      totalUnread: total,
    };
  }

  async incUnreadForMessage(
    receivers: string[],
    roomId: number,
    senderId: string,
  ) {
    if (receivers.length === 0) return;

    const p = this.redis.pipeline();
    for (const uid of receivers) {
      if (uid === senderId) continue;
      p.hincrby(this.unreadHashKey(uid), String(roomId), 1);
      p.incr(this.unreadTotalKey(uid));
    }
    await p.exec();

    for (const uid of receivers) {
      if (uid === senderId) continue;

      const res = await this.redis
        .multi()
        .hget(this.unreadHashKey(uid), String(roomId))
        .get(this.unreadTotalKey(uid))
        .exec();

      if (!res) continue;

      const totalUnreadRaw = res[1]?.[1];

      const totalUnread = Number(totalUnreadRaw ?? 0);

      await this.eventsGateway.emitToUser(uid, 'unread-update', {
        private: totalUnread,
      });
    }
  }

  async clearUnreadForRoom(userId: string, roomId: number) {
    const keyH = this.unreadHashKey(userId);
    const keyT = this.unreadTotalKey(userId);
    const prev = Number((await this.redis.hget(keyH, String(roomId))) || 0);
    if (prev > 0) {
      await this.redis
        .multi()
        .hset(keyH, String(roomId), 0)
        .decrby(keyT, prev)
        .exec();
    }
    const total = Number((await this.redis.get(keyT)) || 0);

    await this.eventsGateway.emitToUser(userId, 'unread-update', {
      private: total,
    });
  }

  async createTextMessage(user: UserPayload, dto: CreateTextMessageDto) {
    return this.dataSource.transaction(async (manager) => {
      const roomRepo = manager.getRepository(PrivateChatRoom);
      const userRepo = manager.getRepository(PrivateChatUsers);
      const msgRepo = manager.getRepository(PrivateChatMessage);

      const maxMessageOrder =
        (await this.getMaxOrder(dto.roomId, msgRepo)) || 0;

      await this.validateRoomId(dto.roomId, roomRepo);
      await this.rejoinIfDeleted(dto.roomId, userRepo, msgRepo);

      await this.readMessage(
        dto.roomId,
        user.id,
        Number(maxMessageOrder) + 1,
        userRepo,
      );
      const saved = await msgRepo.save({
        roomId: dto.roomId,
        senderId: user.id,
        type: dto.type,
        message: dto.message,
        messageOrder: Number(maxMessageOrder) + 1,
      });

      return {
        id: saved.id,
        message: dto.message,
        type: dto.type,
        senderId: user.id,
        roomId: dto.roomId,
        messageOrder: Number(maxMessageOrder) + 1,
        createdAt: saved.createdAt,
        updatedAt: saved.updatedAt,
        senderName: `${user.username} ${user.grade}`,
      };
    });
  }

  async createImageMessage(user: UserPayload, dto: CreateImageMessageDto) {
    return this.dataSource.transaction(async (manager) => {
      const roomRepo = manager.getRepository(PrivateChatRoom);
      const userRepo = manager.getRepository(PrivateChatUsers);
      const msgRepo = manager.getRepository(PrivateChatMessage);

      const imageName = await saveImage(dto.image);

      const maxMessageOrder =
        (await this.getMaxOrder(dto.roomId, msgRepo)) || 0;

      await this.validateRoomId(dto.roomId, roomRepo);
      await this.rejoinIfDeleted(dto.roomId, userRepo, msgRepo);

      await this.readMessage(
        dto.roomId,
        user.id,
        Number(maxMessageOrder) + 1,
        userRepo,
      );

      const saved = await this.pChatMessageRepository.save({
        roomId: dto.roomId,
        senderId: user.id,
        type: dto.type,
        fileUpload: imageName,
        messageOrder: Number(maxMessageOrder) + 1,
      });

      return {
        id: saved.id,
        fileUpload: imageName,
        type: dto.type,
        senderId: user.id,
        roomId: dto.roomId,
        messageORder: Number(maxMessageOrder) + 1,
        createdAt: saved.createdAt,
        updatedAt: saved.updatedAt,
        senderName: `${user.username} ${user.grade}`,
      };
    });
  }

  async createCardMessage(user: UserPayload, dto: CreateCardMessageDto) {
    if (dto.payload.imageUrl?.url) {
      const imageName = await saveImage(dto.payload.imageUrl.url);
      dto.payload.imageUrl.url = imageName;
    }

    return this.dataSource.transaction(async (manager) => {
      const roomRepo = manager.getRepository(PrivateChatRoom);
      const userRepo = manager.getRepository(PrivateChatUsers);
      const msgRepo = manager.getRepository(PrivateChatMessage);

      const maxMessageOrder =
        (await this.getMaxOrder(dto.roomId, msgRepo)) || 0;

      await this.validateRoomId(dto.roomId, roomRepo);
      await this.rejoinIfDeleted(dto.roomId, userRepo, msgRepo);

      await this.readMessage(
        dto.roomId,
        user.id,
        Number(maxMessageOrder) + 1,
        userRepo,
      );
      const saved = await this.pChatMessageRepository.save({
        roomId: dto.roomId,
        senderId: user.id,
        type: dto.type,
        payload: dto.payload,
        messageOrder: Number(maxMessageOrder) + 1,
      });

      return {
        id: saved.id,
        payload: dto.payload,
        type: dto.type,
        senderId: user.id,
        roomId: dto.roomId,
        messageORder: Number(maxMessageOrder) + 1,
        createdAt: saved.createdAt,
        updatedAt: saved.updatedAt,
        senderName: `${user.username} ${user.grade}`,
      };
    });
  }

  roomUsers(
    userId: string,
    roomId: number,
  ): Promise<
    | {
        roomId: number;
        contactId: string;
        username: string;
        grade: string;
      }
    | undefined
  > {
    return this.pChatUserRepository
      .createQueryBuilder('pcu')
      .leftJoin('users', 'u', 'pcu.contactId = u.id')
      .select([
        'pcu.roomId as roomId',
        'pcu.contactId as userId',
        'u.username as username',
        'u.grade as grade',
      ])
      .where('pcu.roomId = :roomId', { roomId })
      .andWhere('pcu.contactId != :userId', { userId })
      .getRawOne();
  }

  getRoomNotification(userId: string, roomId: number) {
    return this.pChatUserRepository
      .createQueryBuilder()
      .select('allowNotification')
      .where('roomId = :roomId', { roomId })
      .andWhere('contactId = :userId', { userId })
      .getRawOne();
  }

  updateRoomNotification(
    userId: string,
    roomId: number,
    allowNotification: boolean,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const userRepo = manager.getRepository(PrivateChatUsers);

      return userRepo.update(
        { roomId: roomId, contactId: userId },
        {
          allowNotification,
        },
      );
    });
  }

  /**
   * 채팅방 메세지 가져오기
   *
   * @param userId 현재 유저 ID
   * @param roomId 채팅방 ID
   * @param offset
   * @param limit
   */
  getMessagesByRoomId(
    userId: string,
    roomId: number,
    offset: number,
    limit: number,
    keyword: string,
  ) {
    const query = this.pChatMessageRepository
      .createQueryBuilder('message')
      .leftJoin('users', 'u', 'message.senderId = u.id')
      .leftJoin(
        PrivateChatUsers,
        'pcu',
        `
          pcu.roomId = message.roomId
          AND pcu.contactId = :userId
          AND pcu.isDeleted = false
        `,
      )
      .select([
        'message.id as id',
        'message.message as message',
        'message.fileUpload as fileUpload',
        'message.type as type',
        'message.payload as payload',
        'message.senderId as senderId',
        'message.roomId as roomId',
        'message.messageOrder as messageOrder',
        'message.createdAt as createdAt',
        'message.updatedAt as updatedAt',
        `CASE WHEN message.senderId = :userId THEN 'Y' ELSE 'N' END AS isMe`,
        `CONCAT(u.username, ' ', u.grade) as senderName`,
      ])
      .where('message.roomId = :roomId', { roomId })
      .andWhere('message.createdAt > COALESCE(pcu.rejoinedAt, pcu.createdAt)')
      .setParameter('userId', userId);

    if (keyword) {
      query.andWhere('message.message LIKE :keyword', {
        keyword: `%${keyword}%`,
      });
    }

    return query
      .orderBy('message.messageOrder', 'DESC')
      .offset((offset - 1) * limit)
      .limit(limit)
      .getRawMany();
  }

  getRoomLastMessages(userId: string) {
    return this.pChatUserRepository
      .createQueryBuilder('pcu')
      .innerJoin(
        'private_chat_message',
        'pcm',
        `pcu.roomId = pcm.roomId AND 
          pcm.messageOrder = (
          SELECT MAX(m2.messageOrder)
          from private_chat_message m2
          where m2.roomId = pcu.roomId
          AND m2.createdAt >= COALESCE(pcu.rejoinedAt, pcu.createdAt))`,
      )
      .innerJoin(
        'private_chat_users',
        'otherUser',
        'otherUser.roomId = pcu.roomId AND otherUser.contactId != :userId',
        { userId },
      )
      .innerJoin('users', 'u', 'u.id = otherUser.contactId')
      .where('pcu.contactId = :userId', { userId })
      .andWhere('pcu.isDeleted = false')
      .select([
        'pcu.roomId as roomId',
        'pcm.createdAt as createdAt',
        `CASE WHEN pcm.type = 'text' THEN pcm.message
              WHEN pcm.type = 'image' THEN '새로운 이미지'
              WHEN pcm.type = 'card' THEN '새로운 카드 메세지'
              END AS message`,
        `CONCAT(u.username, ' ', u.grade) as roomName`,
        'pcm.messageOrder - pcu.lastReadMessageOrder as unreadCount',
      ])
      .orderBy('pcm.createdAt', 'DESC')
      .getRawMany();
  }

  /**
   * 두 유저가 이미 참여 중인 1:1 채팅방이 있는지 확인
   *
   * @param userId 현재 유저 ID
   * @param friendId 상대 유저 ID
   * @returns roomId 또는 undefined
   */
  private getPrivateRoomIfExists(
    userId: string,
    friendId: string,
  ): Promise<{ roomId: number } | undefined> {
    return this.pChatUserRepository
      .createQueryBuilder('pcu1')
      .select('roomId')
      .where((qb) => {
        const subQuery = qb
          .subQuery()
          .select('pcu2.roomId')
          .from(PrivateChatUsers, 'pcu2')
          .where('pcu2.contactId = :friendId', { friendId })
          .getQuery();

        return 'pcu1.roomId = ' + subQuery;
      })
      .andWhere('pcu1.contactID = :userId', { userId })
      .getRawOne();
  }

  /**
   * 두 유저가 이미 참여 중인 1:1 채팅방이 있는지 확인
   *
   * @param roomID 검색하는 roomID
   * @returns true or false
   */
  async isRoomExists(roomId: number): Promise<boolean> {
    const count = await this.pChatRoomRepository.count({
      where: { id: roomId },
    });
    return count > 0;
  }

  async validateRoomId(
    roomId: number,
    roomRepo: Repository<PrivateChatRoom>,
  ): Promise<void> {
    const count = await roomRepo.count({
      where: { id: roomId },
    });
    if (count < 1) throw new NotFoundException('Room not found');
  }
  /**
   * 새로운 1:1 채팅방 생성
   *
   * @returns InsertResult (roomId 포함)
   */
  private createPrivateRoom(roomRepo: Repository<PrivateChatRoom>) {
    return roomRepo.save({});
  }

  /**
   * 채팅방에 유저를 참여자로 추가
   *
   * @param roomId 채팅방 ID
   * @param userId 참여시킬 유저 ID
   * @returns InsertResult
   */
  private async addUserToRoom(
    roomId: number,
    userId: string,
    userRepo: Repository<PrivateChatUsers>,
  ) {
    return userRepo.save({
      roomId: roomId,
      contactId: userId,
    });
  }

  async rejoinIfDeleted(
    roomId: number,
    userRepo: Repository<PrivateChatUsers>,
    msgRepo: Repository<PrivateChatMessage>,
  ): Promise<void> {
    const members = await userRepo.find({
      where: { roomId, isDeleted: true },
    });
    const maxMessageOrder = await this.getMaxOrder(roomId, msgRepo);

    for (const member of members) {
      member.isDeleted = false;
      member.leftAt = null;
      member.rejoinedAt = new Date();
      member.lastReadMessageOrder = maxMessageOrder;
    }

    if (members.length > 0) {
      await userRepo.save(members);
    }
  }

  async updateReadLastMessage(userId: string, roomId: number) {
    await this.dataSource.transaction(async (manager) => {
      const roomRepo = manager.getRepository(PrivateChatRoom);
      const userRepo = manager.getRepository(PrivateChatUsers);
      const msgRepo = manager.getRepository(PrivateChatMessage);

      await this.validateRoomId(roomId, roomRepo);
      const maxMessageOrder = (await this.getMaxOrder(roomId, msgRepo)) || 0;
      await this.readMessage(roomId, userId, maxMessageOrder, userRepo);
      await this.clearUnreadForRoom(userId, roomId);
    });
  }

  async getMaxOrder(
    roomId: number,
    msgRepo: Repository<PrivateChatMessage>,
  ): Promise<number> {
    const result: { maxMessageOrder: number } | undefined = await msgRepo
      .createQueryBuilder('message')
      .select('COALESCE(MAX(message.messageOrder), 0)', 'maxMessageOrder')
      .where('message.roomId = :roomId', { roomId })
      .getRawOne();

    return result ? Number(result.maxMessageOrder) : 0;
  }

  async getLastReadMessage(roomId: number, userId: string): Promise<number> {
    const result: { lastReadMessageOrder: number } | undefined =
      await this.pChatUserRepository
        .createQueryBuilder()
        .select('lastReadMessageOrder')
        .where('contactId= :userId', { userId })
        .andWhere('roomId= :roomId', { roomId })
        .getRawOne();

    return result ? Number(result.lastReadMessageOrder) : 0;
  }

  async readMessage(
    roomId: number,
    userId: string,
    currentOrder: number,
    userRepo: Repository<PrivateChatUsers>,
  ) {
    return await userRepo.update(
      {
        roomId: roomId,
        contactId: userId,
      },
      {
        lastReadMessageOrder: currentOrder,
      },
    );
  }

  async leaveGroup(userId: string, roomId: number) {
    const member = await this.getRoomUser(roomId, userId);
    if (!member) throw new NotFoundException('그룹에 속한 사용자가 아닙니다.');
    member.isDeleted = true;
    member.leftAt = new Date();
    member.rejoinedAt = null;

    await this.pChatUserRepository.save(member);

    const remainingUsers = await this.pChatUserRepository.find({
      where: { roomId, isDeleted: false },
    });
    if (remainingUsers.length === 0) {
      await this.dataSource.transaction(async (manager) => {
        await manager.delete(PrivateChatMessage, { roomId });
        await manager.delete(PrivateChatUsers, { roomId });
        await manager.delete(PrivateChatRoom, { id: roomId });
      });
      return;
    }
  }

  async getRoomUser(roomId: number, userId: string) {
    return this.pChatUserRepository.findOne({
      where: { roomId, contactId: userId, isDeleted: false },
    });
  }

  getRoomUsers(roomId: number) {
    return this.pChatUserRepository
      .createQueryBuilder('pu')
      .select(['pu.contactId as contactId'])
      .where('roomId = :roomId', { roomId })
      .andWhere('isDeleted = false')
      .getRawMany<{ contactId: string }>();
  }
}
