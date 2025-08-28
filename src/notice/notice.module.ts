import { Module } from '@nestjs/common';
import { NoticeService } from './notice.service';
import { NoticeController } from './notice.controller';
import { UsersModule } from 'src/users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notice } from './entity/notice.entity';
import { Files } from 'src/admin/entity/files.entity';

@Module({
  imports: [UsersModule, JwtModule, TypeOrmModule.forFeature([Notice, Files])],
  providers: [NoticeService],
  controllers: [NoticeController],
})
export class NoticeModule {}
