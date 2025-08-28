import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignInDto } from './dto/auth.dto';
import { Public } from 'src/common/decorator/jwtPublic.decorator';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from './auth.guard';
import { User, UserPayload } from 'src/common/decorator/user.decorator';

@ApiTags('인증관련')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post()
  @Public()
  @ApiOperation({
    summary: '로그인 토큰 생성',
    description: '테스트용 로그인 토큰 생성',
  })
  signIn(@Body() { id }: SignInDto) {
    return this.authService.signin(id);
  }

  @Get('validate')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '토큰 검증',
    description: '유효한 토큰 검증',
  })
  validateToken(@User() user: UserPayload) {
    return {
      message: 'token is valid',
      user,
    };
  }
}
