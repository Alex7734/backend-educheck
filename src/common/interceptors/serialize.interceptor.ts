import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { instanceToPlain } from 'class-transformer';
import { map, Observable } from 'rxjs';

@Injectable()
export class SerializeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, handler: CallHandler): Observable<any> {
    return handler.handle().pipe(
      map((data: any) => {
        if (data?.data) {
          return {
            ...data,
            data: instanceToPlain(data.data, { excludeExtraneousValues: true })
          };
        }
        return instanceToPlain(data, { excludeExtraneousValues: true });
      })
    );
  }
}