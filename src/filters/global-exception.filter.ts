import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { QueryFailedError } from 'typeorm';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    this.logger.error(`Exception: ${exception}`);

    let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string = '서버 내부 오류가 발생했습니다.';
    let errorCode: string = 'INTERNAL_SERVER_ERROR';
    let statusCode: number = status; // 응답에 포함할 statusCode

    // 1. HTTP 예외 처리 (NotFoundException, BadRequestException 등)
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      statusCode = status;

      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const responseObj = exceptionResponse as { message?: string };
        message = responseObj.message || '서버 에러 발생';
      }

      errorCode = HttpStatus[status] || 'HTTP_ERROR';
    }

    // 2. TypeORM 쿼리 실패 예외 처리
    else if (exception instanceof QueryFailedError) {
      status = HttpStatus.BAD_REQUEST;
      statusCode = status;
      message = `Database query failed: ${(exception as QueryFailedError).message}`;
      errorCode = 'SQL_ERROR';
    }

    // 3. 응답 전송
    response.status(status).json({
      success: false,
      statusCode,
      message,
      errorCode,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
