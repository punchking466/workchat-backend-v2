import { forwardRef, Module } from '@nestjs/common';
import { GroupChatController } from './group-chat.controller';
import { GroupChatService } from './group-chat.service';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Groups } from './entities/groups.entity';
import { GroupUsers } from './entities/groupUsers.entity';
import { GroupMessage } from './entities/groupMessage.entity';
import { UsersModule } from 'src/users/users.module';
import { EventsModule } from 'src/events/events.module';

@Module({
  imports: [
    JwtModule,
    UsersModule,
    forwardRef(() => EventsModule),
    TypeOrmModule.forFeature([Groups, GroupUsers, GroupMessage]),
  ],
  controllers: [GroupChatController],
  providers: [GroupChatService],
  exports: [GroupChatService],
})
export class GroupChatModule {}
