# Middleware

Express middleware functions applied to incoming requests. Loaded in `server.ts` in a specific order.

- `auth.middleware.ts` - JWT verification and user injection into req
- `error-handler.middleware.ts` - Global error catching, sanitization, and structured error responses
- `rate-limiter.middleware.ts` - Per-IP and per-user request rate limiting
- `request-logger.middleware.ts` - HTTP request/response logging with Pino
- `validate.middleware.ts` - Zod schema validation wrapper for route handlers

## Adding new middleware

1. Create the file here following the `*.middleware.ts` naming convention
2. Export a function matching Express middleware signature
3. Register it in `server.ts` in the appropriate position
