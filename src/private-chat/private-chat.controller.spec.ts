import { Test, TestingModule } from '@nestjs/testing';
import { PrivateChatController } from './private-chat.controller';

describe('PrivateChatController', () => {
  let controller: PrivateChatController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PrivateChatController],
    }).compile();

    controller = module.get<PrivateChatController>(PrivateChatController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
