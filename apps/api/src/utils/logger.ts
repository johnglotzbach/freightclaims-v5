/**
 * Logger - Structured JSON logging with Pino
 *
 * Single logger instance used across the entire API. Outputs JSON in production
 * for log aggregation tools, and pretty-printed output in development for readability.
 *
 * Location: apps/api/src/utils/logger.ts
 */
import pino from 'pino';

const isDev = process.env.NODE_ENV === 'development';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: [
      'req.headers.authorization',
      'req.body.password',
      'req.body.currentPassword',
      'req.body.newPassword',
      'req.body.creditCard',
      'req.body.ssn',
      'req.body.token',
      'req.body.resetToken',
      'req.body.refreshToken',
      'req.body.apiKey',
      'req.body.secret',
      '*.passwordHash',
      '*.password',
      '*.token',
      '*.apiKey',
      '*.secret',
    ],
    censor: '[REDACTED]',
  },
  ...(isDev && {
    transport: {
      target: 'pino-pretty' as const,
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname',
      },
    },
  }),
  // Production gets raw JSON logs -- ideal for CloudWatch / Datadog / etc.
  formatters: {
    level: (label: string) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});
