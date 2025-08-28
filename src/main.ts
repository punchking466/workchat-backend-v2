import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, RequestMethod, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ResponseInterceptor } from './interceptors/response.interceptor';
import { GlobalExceptionFilter } from './filters/global-exception.filter';
import { RedisIoAdapter } from './utils/redisAdapter';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as fs from 'fs';
import type { Request, Response } from 'express';

async function bootstrap() {
  const isProd = process.env.NODE_ENV === 'prod';

  const httpsOptions = isProd
    ? {
        key: fs.readFileSync(process.env.SSL_KEY!, 'utf8'),
        cert: fs.readFileSync(process.env.SSL_CERT!, 'utf8'),
      }
    : undefined;

  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    httpsOptions ? { httpsOptions } : {},
  );

  app.setGlobalPrefix('api', {
    exclude: [{ path: 'generate_204', method: RequestMethod.GET }],
  });

  app.use('/generate_204', (_req: Request, res: Response) => {
    res.status(204).send();
  });
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT');
  const logger = new Logger('main');

  //Cors 설정
  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'refreshToken',
      'Access-Control-Allow-Origin',
    ],
    credentials: true,
  });

  app.setGlobalPrefix('api');
  // class validator pipe
  app.useGlobalPipes(new ValidationPipe());
  // api log 출력용
  app.useGlobalInterceptors(new ResponseInterceptor());
  // 에러 핸들러
  app.useGlobalFilters(new GlobalExceptionFilter());

  app.useStaticAssets(
    '/Users/iseungbin/project/chat-project/workchat-backend/files',
    {
      prefix: '/public',
    },
  );
  app.useStaticAssets('/images/noticefiles', {
    prefix: '/notice',
  });

  // app.useStaticAssets('/images/workchat-client', {
  //   prefix: '/public',
  // });
  // app.useStaticAssets('/images/noticefiles', {
  //   prefix: '/notice',
  // });

  logger.log(`workchat run ${port} port`);
  logger.log(`workchat run ${process.env.NODE_ENV} port`);

  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();

  app.useWebSocketAdapter(redisIoAdapter);

  const config = new DocumentBuilder()
    .setTitle('Workchat Backend API')
    .setDescription('The Workchat API description')
    .setVersion('1.0')
    .addTag('workchat')
    .addBearerAuth()
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger', app, documentFactory);
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
