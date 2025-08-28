import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async signin(id: string): Promise<{ access_token: string }> {
    const user = await this.usersService.findById(id);

    if (!user) throw new UnauthorizedException();

    const payload = { id: user.id, username: user.username, grade: user.grade };
    return { access_token: await this.jwtService.signAsync(payload) };
  }
}
