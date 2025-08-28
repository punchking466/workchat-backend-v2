import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsString,
} from 'class-validator';

export enum MessageType {
  TEXT = 'text',
  CARD = 'card',
  IMAGE = 'image',
}

export class CreateGroupDto {
  @ApiProperty({
    description: '그룹 채팅방 이름',
    default: '테스트 그룹1',
  })
  @IsString()
  groupName: string;

  @ApiProperty({
    description: '그룹 채팅방 유저',
    default: ['KV31AASC1B02', 'KV31AASC1B03'],
  })
  @IsNotEmpty()
  @IsArray()
  groupUsers: string[];
}

export class AddUsersToGruop {
  @ApiProperty({
    description: '추가할 그룹 채팅방 유저',
    default: ['KV31AASC1B02', 'KV31AASC1B03'],
  })
  @IsNotEmpty()
  @IsArray()
  groupUsers: string[];
}

export class CreateTextMessageDto {
  @ApiProperty({
    description: 'roomId',
    default: '2',
  })
  @IsNumber()
  @IsNotEmpty()
  roomId: number;

  @ApiProperty({
    description: '메세지 타입',
    default: 'text',
  })
  @IsString()
  @IsNotEmpty()
  type: MessageType;

  @ApiProperty({
    description: '메세지 본문',
    default: '메세지 본문',
  })
  @IsString()
  message: string;
}

export class CreateImageMessageDto {
  @ApiProperty({
    description: 'roomId',
    default: '2',
  })
  @IsNumber()
  @IsNotEmpty()
  roomId: number;

  @ApiProperty({
    description: '메세지 타입',
    default: 'image',
  })
  @IsString()
  @IsNotEmpty()
  type: MessageType;

  @ApiProperty({
    description: 'base64로 전달',
    default: 'base64:image~',
  })
  @IsString()
  @IsNotEmpty()
  image: string;
}

export class CreateCardMessageDto {
  @ApiProperty({
    description: 'roomId',
    default: '2',
  })
  @IsNumber()
  @IsNotEmpty()
  roomId: number;

  @ApiProperty({
    description: '메세지 타입',
    default: 'card',
  })
  @IsString()
  @IsNotEmpty()
  type: MessageType;

  @ApiProperty({
    description: '사번',
    default: {
      title: '카드 제목',
      subtitle: '부제',
      text: '메인 텍스트',
      buttons: { type: 'default', title: '버튼', action: 'navigate-14' },
      imageUrl: {
        url: 'asdasdasd',
        alt: 'report',
      },
    },
  })
  @IsObject()
  @IsNotEmpty()
  payload: {
    title: string;
    subtitle?: string;
    text?: string;
    buttons?: { type: string; title: string; action: string }[];
    imageUrl?: {
      url: string;
      alt: string;
    };
  };
}

export class NotificationDto {
  @ApiProperty({
    description: '알림 허용 여부',
    default: true,
  })
  @IsBoolean()
  allowNotification: boolean;
}
