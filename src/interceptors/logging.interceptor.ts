import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { catchError, map, Observable, throwError } from 'rxjs';

@Injectable()
export class LoggingInterceptor<T> implements NestInterceptor<T, any> {
  private logger = new Logger(LoggingInterceptor.name);
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url } = request;

    this.logger.log(`Request : ${method} ${url}`);

    return next.handle().pipe(
      map((data) => {
        this.logger.log(`Success : ${method} ${url}`);
        return data;
      }),
      catchError((error: Error) => {
        this.logger.error(`Error : ${method} ${url} - ${error.message}`);
        return throwError(() => error);
      }),
    );
  }
}
