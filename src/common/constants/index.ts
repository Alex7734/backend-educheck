export const Environment = {
  development: 'development',
  production: 'production',
  test: 'test',
} as const;

export type Environment = (typeof Environment)[keyof typeof Environment];

export const RETRY_DELAY_MS = 60000;
