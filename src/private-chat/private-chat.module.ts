import { Module } from '@nestjs/common';
import { PrivateChatController } from './private-chat.controller';
import { PrivateChatService } from './private-chat.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrivateChatRoom } from 'src/private-chat/entities/privateChatRoom.entity';
import { PrivateChatUsers } from 'src/private-chat/entities/privateChatUsers.entity';
import { PrivateChatMessage } from 'src/private-chat/entities/privateChatMessage.entity';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from 'src/users/users.module';
import { EventsModule } from 'src/events/events.module';

@Module({
  imports: [
    EventsModule,
    JwtModule,
    UsersModule,
    TypeOrmModule.forFeature([
      PrivateChatRoom,
      PrivateChatUsers,
      PrivateChatMessage,
    ]),
  ],
  controllers: [PrivateChatController],
  providers: [PrivateChatService],
  exports: [PrivateChatService],
})
export class PrivateChatModule {}
