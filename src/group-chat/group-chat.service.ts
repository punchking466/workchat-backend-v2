import {
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { GroupUsers, LeaveType } from './entities/groupUsers.entity';
import { Groups } from './entities/groups.entity';
import { DataSource, Repository } from 'typeorm';
import {
  CreateCardMessageDto,
  CreateGroupDto,
  CreateImageMessageDto,
  CreateTextMessageDto,
} from './dto/group-chat.dto';
import { UsersService } from 'src/users/users.service';
import { UserPayload } from 'src/common/decorator/user.decorator';
import { GroupMessage } from './entities/groupMessage.entity';
import { Users } from 'src/users/users.entity';
import { saveImage } from 'src/utils/endecodeImage';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { EventsGateway } from 'src/events/events.gateway';

@Injectable()
export class GroupChatService {
  constructor(
    @InjectRedis() private readonly redis: Redis,
    @InjectRepository(Groups)
    private groupsRepository: Repository<Groups>,
    @InjectRepository(GroupUsers)
    private groupUserRepository: Repository<GroupUsers>,
    @InjectRepository(GroupMessage)
    private groupMessageRepository: Repository<GroupMessage>,
    private usersService: UsersService,
    private dataSource: DataSource,
    @Inject(forwardRef(() => EventsGateway))
    private eventsGateway: EventsGateway,
  ) {}

  private unreadHashKey = (uid: string) => `user:${uid}:group:unread`;
  private unreadTotalKey = (uid: string) => `user:${uid}:group:unread:total`;

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
    const query = this.groupMessageRepository
      .createQueryBuilder('message')
      .leftJoin('users', 'u', 'message.senderId = u.id')
      .leftJoin(
        'group_users',
        'gu',
        'gu.groupId = message.groupId AND gu.contactId = :userId AND gu.isDeleted = false',
      )
      .select([
        'message.id as id',
        'message.message as message',
        'message.fileUpload as fileUpload',
        'message.type as type',
        'message.payload as payload',
        'message.senderId as senderId',
        'message.groupId as roomId',
        'message.messageOrder as messageOrder',
        'message.createdAt as createdAt',
        'message.updatedAt as updatedAt',
        `CASE WHEN message.senderId = :userId THEN 'Y' ELSE 'N' END AS isMe`,
        `CONCAT(u.username, ' ', u.grade) as senderName`,
      ])
      .where('message.groupId = :roomId', { roomId })
      .andWhere('message.createdAt > COALESCE(gu.rejoinedAt, gu.createdAt)')
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
    return this.groupUserRepository
      .createQueryBuilder('gu')
      .leftJoin(
        'group_message',
        'gm',
        `gu.groupId = gm.groupId  AND
                gm.messageOrder = (
                SELECT MAX(gm2.messageOrder)
                from group_message gm2
                where gm2.groupId = gm.groupId
                AND gm2.createdAt > COALESCE(gu.rejoinedAt, gu.createdAt)
                )
            `,
      )
      .leftJoin('groups', 'group', 'group.id = gu.groupId ')
      .leftJoin('groups', 'gr', 'gr.id = gm.groupId')
      .where('gu.contactId = :userId', { userId })
      .andWhere('gu.isDeleted = false')
      .select([
        'gu.groupId as roomId',
        'group.name as roomName',
        `CASE WHEN gm.type = 'text' THEN gm.message
              WHEN gm.type = 'image' THEN '새로운 이미지'
              WHEN gm.type = 'card' THEN '새로운 카드 메세지'
              END AS message`,
        'gm.type as type',
        'gm.messageOrder - gu.lastReadMessageOrder as unreadCount',
        'gm.createdAt as createdAt',
      ])
      .orderBy('gm.createdAt', 'DESC')
      .getRawMany();
  }

  async warmUnreadGroupCache(userId: string) {
    await this.redis.del(
      this.unreadHashKey(userId),
      this.unreadTotalKey(userId),
    );

    const rows = await this.groupUserRepository
      .createQueryBuilder('gu')
      .leftJoin(
        (qb) =>
          qb
            .from(GroupMessage, 'gm')
            .select('gm.groupId', 'gid')
            .addSelect('MAX(gm.messageOrder)', 'lastOrder')
            .groupBy('gm.groupId'),
        'L',
        'L.gid = gu.groupId',
      )
      .where('gu.contactId = :uid', { uid: userId })
      .andWhere('gu.isDeleted = false')
      .select([
        'gu.groupId AS roomId',
        'GREATEST(COALESCE(L.lastOrder, 0) - gu.lastReadMessageOrder, 0) AS unread',
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
        group: totalUnread,
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
      group: total,
    });
  }

  async createGroupRoom(
    userId: string,
    { groupName, groupUsers }: CreateGroupDto,
  ) {
    for (const user of groupUsers) {
      const friend = await this.usersService.findById(user);
      if (!friend) {
        throw new NotFoundException(`${user} not Found`);
      }
    }
    const groupId = (await this.createRoom(groupName)).id;

    await this.initializeGroupMembers(groupId, userId, groupUsers);

    return { success: true, groupId, groupName, groupUsers };
  }

  async createTextMessage(user: UserPayload, dto: CreateTextMessageDto) {
    return this.dataSource.transaction(async (manager) => {
      const groupRepo = manager.getRepository(Groups);
      const userRepo = manager.getRepository(GroupUsers);
      const msgRepo = manager.getRepository(GroupMessage);

      const maxMessageOrder =
        (await this.getMaxOrder(dto.roomId, msgRepo)) || 0;

      await this.validateRoomId(dto.roomId, groupRepo);
      await this.readMessage(
        dto.roomId,
        user.id,
        Number(maxMessageOrder) + 1,
        userRepo,
      );

      const saved = await msgRepo.save({
        groupId: dto.roomId,
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
      const groupRepo = manager.getRepository(Groups);
      const userRepo = manager.getRepository(GroupUsers);
      const msgRepo = manager.getRepository(GroupMessage);

      const maxMessageOrder =
        (await this.getMaxOrder(dto.roomId, msgRepo)) || 0;

      await this.validateRoomId(dto.roomId, groupRepo);
      await this.readMessage(
        dto.roomId,
        user.id,
        Number(maxMessageOrder) + 1,
        userRepo,
      );
      const imageName = await saveImage(dto.image);

      const saved = await this.groupMessageRepository.save({
        groupId: dto.roomId,
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
      const groupRepo = manager.getRepository(Groups);
      const userRepo = manager.getRepository(GroupUsers);
      const msgRepo = manager.getRepository(GroupMessage);

      const maxMessageOrder =
        (await this.getMaxOrder(dto.roomId, msgRepo)) || 0;

      await this.validateRoomId(dto.roomId, groupRepo);
      await this.readMessage(
        dto.roomId,
        user.id,
        Number(maxMessageOrder) + 1,
        userRepo,
      );

      const saved = await this.groupMessageRepository.save({
        groupId: dto.roomId,
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

  getRoomInfo(roomId: number) {
    return this.groupsRepository
      .createQueryBuilder()
      .select()
      .where('id = :roomId', { roomId })
      .getOne();
  }

  getRoomUsers(roomId: number) {
    return this.groupUserRepository
      .createQueryBuilder('gu')
      .leftJoin(Users, 'u', 'gu.contactId = u.id')
      .select([
        'gu.contactId as contactId',
        'gu.isAdmin as isAdmin',
        'gu.groupId as groupId',
        'u.username as username',
        'u.grade as grade',
      ])
      .where('groupId = :roomId', { roomId })
      .andWhere('isDeleted = false')
      .getRawMany<{ contactId: string; isAdmin: boolean }>();
  }

  getRoomNotification(userId: string, roomId: number) {
    return this.groupUserRepository
      .createQueryBuilder()
      .select('allowNotification')
      .where('groupId = :roomId', { roomId })
      .andWhere('contactId = :userId', { userId })
      .getRawOne();
  }

  updateRoomNotification(
    userId: string,
    roomId: number,
    allowNotification: boolean,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const userRepo = manager.getRepository(GroupUsers);

      return userRepo.update(
        { groupId: roomId, contactId: userId },
        {
          allowNotification,
        },
      );
    });
  }

  async getGroupUser(groupId: number, userId: string) {
    return this.groupUserRepository.findOne({
      where: { groupId, contactId: userId, isDeleted: false },
    });
  }

  async addUsersToGroup(groupId: number, groupUsers: string[]) {
    const exsting = await this.groupUserRepository
      .createQueryBuilder()
      .select()
      .where('groupId = :groupId', { groupId })
      .andWhere('contactId In(:...groupUsers)', { groupUsers })
      .getMany();

    const newEntries: GroupUsers[] = [];
    const updateEntries: GroupUsers[] = [];

    for (const userId of groupUsers) {
      const exstingMember = exsting.find((u) => u.contactId === userId);

      if (!exstingMember) {
        newEntries.push(
          this.groupUserRepository.create({
            groupId,
            contactId: userId,
            isAdmin: false,
          }),
        );
      } else if (exstingMember.isDeleted) {
        exstingMember.isDeleted = false;
        exstingMember.leaveType = null;
        exstingMember.kickedBy = null;
        exstingMember.leftAt = null;
        exstingMember.rejoinedAt = new Date();
        updateEntries.push(exstingMember);
      }
    }

    if (newEntries.length > 0) {
      await this.groupUserRepository.save(newEntries);
    }
    if (updateEntries.length > 0) {
      await this.groupUserRepository.save(updateEntries);
    }
  }

  async leaveGroup(userId: string, groupId: number) {
    const member = await this.getGroupUser(groupId, userId);

    if (!member) throw new NotFoundException('그룹에 속한 사용자가 아닙니다.');
    member.isAdmin = false;
    member.isDeleted = true;
    member.leaveType = LeaveType.SELF;
    member.leftAt = new Date();

    await this.groupUserRepository.save(member);
    await this.handlePostLeaveCleanup(groupId, userId);
  }

  async kickUser(adminUserId: string, targetUserId: string, groupId: number) {
    const member = await this.getGroupUser(groupId, targetUserId);

    if (!member) throw new NotFoundException('그룹에 속한 사용자가 아닙니다.');
    member.isAdmin = false;
    member.isDeleted = true;
    member.leaveType = LeaveType.KICK;
    member.kickedBy = adminUserId;
    member.leftAt = new Date();

    await this.groupUserRepository.save(member);
    await this.handlePostLeaveCleanup(groupId, targetUserId);
  }

  private async handlePostLeaveCleanup(groupId: number, userId: string) {
    const remainingUsers = await this.groupUserRepository.find({
      where: { groupId, isDeleted: false },
      order: { createdAt: 'ASC' },
    });
    if (remainingUsers.length === 0) {
      await this.dataSource.transaction(async (manager) => {
        await manager.delete(GroupMessage, { groupId });
        await manager.delete(GroupUsers, { groupId });
        await manager.delete(Groups, { id: groupId });
      });
      return;
    }

    const isAdminGone = !(await this.groupUserRepository.findOne({
      where: { groupId, contactId: userId, isAdmin: true },
    }));

    if (isAdminGone && remainingUsers.length > 0) {
      remainingUsers[0].isAdmin = true;
      await this.groupUserRepository.save(remainingUsers[0]);
    }
  }

  private async createRoom(groupName: string) {
    return this.groupsRepository.save({
      name: groupName,
      leave_group: true,
      delete_group: true,
    });
  }

  private async initializeGroupMembers(
    groupId: number,
    userId: string,
    groupUsers: string[],
  ) {
    const groupUserEntries = [
      {
        groupId: groupId,
        contactId: userId,
        isAdmin: true,
      },
      ...groupUsers.map((user) => ({
        groupId: groupId,
        contactId: user,
        isAdmin: false,
      })),
    ];

    await this.groupUserRepository.save(groupUserEntries);
  }

  async isRoomExists(groupId: number): Promise<boolean> {
    const count = await this.groupsRepository.count({
      where: { id: groupId },
    });
    return count > 0;
  }

  async validateRoomId(
    groupId: number,
    groupRepo: Repository<Groups>,
  ): Promise<void> {
    const count = await groupRepo.count({
      where: { id: groupId },
    });
    if (count < 1) throw new NotFoundException('Room not found');
  }

  async updateReadLastMessage(userId: string, roomId: number) {
    await this.dataSource.transaction(async (manager) => {
      const groupRepo = manager.getRepository(Groups);
      const userRepo = manager.getRepository(GroupUsers);
      const msgRepo = manager.getRepository(GroupMessage);

      await this.validateRoomId(roomId, groupRepo);
      const maxMessageOrder = (await this.getMaxOrder(roomId, msgRepo)) || 0;
      await this.readMessage(roomId, userId, maxMessageOrder, userRepo);
      await this.clearUnreadForRoom(userId, roomId);
    });
  }

  async getMaxOrder(
    groupId: number,
    msgRepo: Repository<GroupMessage>,
  ): Promise<number> {
    const result: { maxMessageOrder: number } | undefined = await msgRepo
      .createQueryBuilder('message')
      .select('COALESCE(MAX(message.messageOrder), 0)', 'maxMessageOrder')
      .where('message.groupId = :groupId', { groupId })
      .getRawOne();

    return result ? Number(result.maxMessageOrder) : 0;
  }

  async readMessage(
    groupId: number,
    userId: string,
    currentOrder: number,
    userRepo: Repository<GroupUsers>,
  ) {
    return await userRepo.update(
      {
        groupId: groupId,
        contactId: userId,
      },
      {
        lastReadMessageOrder: currentOrder,
      },
    );
    // .createQueryBuilder()
    // .update(GroupUsers)
    // .set({ lastReadMessageOrder: currentOrder })
    // .where('groupId = :groupId AND contactId = :userId', {
    //   groupId,
    //   userId,
    // })
    // .execute();
  }
}
