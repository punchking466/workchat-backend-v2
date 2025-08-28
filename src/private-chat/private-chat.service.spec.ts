import { Test, TestingModule } from '@nestjs/testing';
import { PrivateChatService } from './private-chat.service';

describe('PrivateChatService', () => {
  let service: PrivateChatService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrivateChatService],
    }).compile();

    service = module.get<PrivateChatService>(PrivateChatService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
