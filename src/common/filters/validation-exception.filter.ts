import { ExceptionFilter, Catch, ArgumentsHost, BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import { QueryFailedError } from 'typeorm';

@Catch(BadRequestException, QueryFailedError)
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: BadRequestException | QueryFailedError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception instanceof BadRequestException ? exception.getStatus() : 400;
    const exceptionResponse: any = exception instanceof BadRequestException ? exception.getResponse() : exception.message;

    response.status(status).json({
      statusCode: status,
      message: exceptionResponse.message || 'Field validation error',
    });
  }
}
