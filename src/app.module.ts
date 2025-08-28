import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { entities } from './utils/entities';
import { UsersController } from './users/users.controller';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { FriendsController } from './friends/friends.controller';
import { FriendsModule } from './friends/friends.module';
import { PrivateChatModule } from './private-chat/private-chat.module';
import { EventsModule } from './events/events.module';
import { RedisModule } from '@nestjs-modules/ioredis';
import { GroupChatModule } from './group-chat/group-chat.module';
import { NoticeModule } from './notice/notice.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `src/configs/.${process.env.NODE_ENV}.env`,
    }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 3306,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: entities,
      charset: 'utf8mb4',
      synchronize: process.env.NODE_ENV === 'sync' ? true : false,
      logging: process.env.NODE_ENV === 'prod' ? true : false,
    }),
    RedisModule.forRoot({
      type: 'single',
      url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
      options: {
        password: process.env.REDIS_PASSWORD,
      },
    }),
    UsersModule,
    AuthModule,
    FriendsModule,
    PrivateChatModule,
    EventsModule,
    GroupChatModule,
    NoticeModule,
    AdminModule,
  ],
  controllers: [AppController, UsersController, FriendsController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    AppService,
  ],
})
export class AppModule {}
