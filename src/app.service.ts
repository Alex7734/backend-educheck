import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealthStatus(): { status: string; version: string } {
    return {
      status: 'API is running',
      version: '1.0.0',
    };
  }
}