/**
 * Validation Middleware - Zod schema validation for request data
 *
 * Factory function that takes a Zod schema and returns Express middleware
 * that validates the request body (or query/params) against it. Invalid
 * requests get a 400 with detailed field-level error messages.
 *
 * Location: apps/api/src/middleware/validate.middleware.ts
 * Related: apps/api/src/validators/ (Zod schemas per domain)
 */
import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema, ZodError } from 'zod';

/**
 * Creates validation middleware for the given Zod schema.
 * Validates req.body by default. Use the `source` param to validate
 * query parameters or route params instead.
 *
 * @param schema - Zod schema to validate against
 * @param source - Which part of the request to validate ('body' | 'query' | 'params')
 * @returns Express middleware that validates and transforms the request data
 *
 * @example
 * router.post('/claims', validate(createClaimSchema), claimsController.create);
 */
export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  // Support request-level schemas like z.object({ body: z.object({...}) })
  const effectiveSchema = (schema as any).shape?.[source] ?? schema;

  return (req: Request, res: Response, next: NextFunction): void => {
    const result = effectiveSchema.safeParse(req[source]);

    if (!result.success) {
      const errors = formatZodErrors(result.error);
      res.status(400).json({
        error: 'Validation failed',
        details: errors,
      });
      return;
    }

    // Replace the raw data with the parsed/transformed version
    req[source] = result.data;
    next();
  };
}

/**
 * Converts Zod's error format into a flat field -> message map
 * that's easier for frontend consumers to work with.
 */
function formatZodErrors(error: ZodError): Record<string, string> {
  const formatted: Record<string, string> = {};

  for (const issue of error.issues) {
    const path = issue.path.join('.');
    formatted[path] = issue.message;
  }

  return formatted;
}
