import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SignInDto {
  @ApiProperty({
    description: '사번',
    default: 'KV31AASC1B01',
  })
  @IsNotEmpty()
  @IsString()
  id: string;
}
