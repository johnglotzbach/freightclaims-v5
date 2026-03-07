/**
 * Rate Limiter Middleware - Prevents abuse and ensures fair usage
 *
 * Applies per-IP rate limiting to all API endpoints. Separate limiters
 * can be created for specific routes (e.g., stricter limits on auth endpoints).
 *
 * Location: apps/api/src/middleware/rate-limiter.middleware.ts
 */
import rateLimit from 'express-rate-limit';

/**
 * General API rate limiter -- 200 requests per 15 minutes per IP.
 * This is the default applied to all routes.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests, please try again later',
    retryAfter: '15 minutes',
  },
});

/**
 * Stricter rate limiter for authentication routes -- 20 attempts per 15 minutes.
 * Prevents brute-force login attacks.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many authentication attempts, please try again later',
    retryAfter: '15 minutes',
  },
});
