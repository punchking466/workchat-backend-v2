import { Module } from '@nestjs/common';
import { FriendsController } from './friends.controller';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [FriendsController],
})
export class FriendsModule {}
