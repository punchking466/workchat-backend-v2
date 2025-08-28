import { Controller, Get } from '@nestjs/common';
import { AdminService } from './admin.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('/banword')
  @ApiOperation({
    summary: '금지단어',
    description: '금지단어 조회',
  })
  async getBanWord() {
    return await this.adminService.getBanWord();
  }
}
