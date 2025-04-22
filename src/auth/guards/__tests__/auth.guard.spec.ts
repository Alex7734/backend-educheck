import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '../auth.guard';

const mockExecutionContext = {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({}),
    }),
} as any;

describe('JwtAuthGuard', () => {
    let guard: JwtAuthGuard;
    let reflector: Reflector;
    let mockExecutionContext: ExecutionContext;

    beforeEach(() => {
        reflector = new Reflector();
        guard = new JwtAuthGuard(reflector);

        mockExecutionContext = mockExecutionContext;
    });

    it('should be defined', () => {
        expect(guard).toBeDefined();
    });

    describe('handleRequest', () => {
        it('should return user when valid', () => {
            const user = { id: 1, email: 'test@example.com' };
            const result = guard.handleRequest(null, user, null);

            expect(result).toBe(user);
        });

        it('should throw error when error exists', () => {
            const error = new Error('Test error');

            expect(() => guard.handleRequest(error, null, null)).toThrow(error);
        });

        it('should throw UnauthorizedException when no user exists', () => {
            expect(() => guard.handleRequest(null, null, null))
                .toThrow('Invalid or expired token');
        });
    });
});