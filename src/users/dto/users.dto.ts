import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class FindUserIdDto {
  @ApiProperty({
    description: '사번',
    default: 'KV31ASC0001',
  })
  @IsNotEmpty()
  @IsString()
  id: string;
}

export class UpdateAllowNotificationDto {
  @ApiProperty({
    description: '전체 알림 허용',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  allowNotification: boolean;

  @ApiProperty({
    description: '알림 소리 허용',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  allowSound: boolean;

  @ApiProperty({
    description: '알림 진동 허용',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  allowVibration: boolean;
}

export class CreateUserDto {
  @ApiProperty({
    description: '사번',
    default: 'KV31AASC1B01',
  })
  @IsNotEmpty()
  @IsString()
  id: string;

  @ApiProperty({
    description: '이름',
    default: '홍길동',
  })
  @IsNotEmpty()
  @IsString()
  username: string;

  @ApiProperty({
    description: '부서 (K : 조립,Q : 도장, P : 품질)',
    default: 'K',
  })
  @IsNotEmpty()
  @IsString()
  auth: string;

  @ApiProperty({
    description: '공장 (6: 광주2공장 7:광주1공장 8:광주3공장)',
    default: '7',
  })
  @IsNotEmpty()
  @IsString()
  plant: string;

  @ApiProperty({
    description:
      '공장구분 (KV31A: 광주1공장, KV32A:광주2공장, KV32A:광주3공장)',
    default: 'KV31A',
  })
  @IsNotEmpty()
  @IsString()
  plantShop: string;

  @ApiProperty({
    description: '프로필이미지 base64',
    default: '',
  })
  @IsString()
  profileImage: string;

  @ApiProperty({
    description:
      'A(관리자), G(그룹장), P(파트장), S(주임), O(사무실), U(일반사용자), D(개발자)',
    default: 'U',
  })
  @IsNotEmpty()
  @IsString()
  position: string;

  @ApiProperty({
    description: '사용자부서(W2)',
    default: 'K',
  })
  @IsNotEmpty()
  @IsString()
  department: string;

  @ApiProperty({
    description: '직급',
    default: '',
  })
  @IsString()
  grade: string;

  @ApiProperty({
    description: '공정명',
    default: '조립',
  })
  @IsNotEmpty()
  @IsString()
  authName: string;
}
