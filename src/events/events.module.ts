import { forwardRef, Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { UserHandler } from './handlers/user.handler';
import { JwtModule } from '@nestjs/jwt';
import { GroupChatModule } from 'src/group-chat/group-chat.module';
import { PrivateChatModule } from 'src/private-chat/private-chat.module';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    JwtModule,
    UsersModule,
    forwardRef(() => GroupChatModule),
    forwardRef(() => PrivateChatModule),
  ],
  providers: [EventsGateway, UserHandler],
  exports: [EventsGateway],
})
export class EventsModule {}
