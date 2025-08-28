import { ApiProperty } from '@nestjs/swagger';
import {
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

export class CreateRoomDto {
  @ApiProperty({
    description: '사번',
    default: 'KV31ASC0002',
  })
  @IsNotEmpty()
  @IsString()
  friendId: string;
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
