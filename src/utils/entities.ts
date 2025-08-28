import { GroupMessage } from 'src/group-chat/entities/groupMessage.entity';
import { Groups } from 'src/group-chat/entities/groups.entity';
import { GroupUsers } from 'src/group-chat/entities/groupUsers.entity';
import { Notice } from 'src/notice/entity/notice.entity';
import { PrivateChatMessage } from 'src/private-chat/entities/privateChatMessage.entity';
import { PrivateChatRoom } from 'src/private-chat/entities/privateChatRoom.entity';
import { PrivateChatUsers } from 'src/private-chat/entities/privateChatUsers.entity';
import { Users } from '../users/users.entity';
import { Files } from 'src/admin/entity/files.entity';

export const entities = [
  PrivateChatMessage,
  PrivateChatUsers,
  PrivateChatRoom,
  Groups,
  GroupUsers,
  GroupMessage,
  Users,
  Notice,
  Files,
];
