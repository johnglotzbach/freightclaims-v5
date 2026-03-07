/**
 * API Response Helpers - Standardized response format for all endpoints
 *
 * Ensures every API response follows the same shape:
 * { status: 'success' | 'error', message: string, data?: T }
 *
 * Location: apps/api/src/utils/api-response.ts
 */
import type { Response } from 'express';

interface ApiResponsePayload<T> {
  status: 'success' | 'error';
  message: string;
  data?: T;
}

/** 200 OK response */
export function ok<T>(res: Response, message: string, data?: T): Response {
  const payload: ApiResponsePayload<T> = { status: 'success', message };
  if (data !== undefined) payload.data = data;
  return res.status(200).json(payload);
}

/** 201 Created response */
export function created<T>(res: Response, message: string, data?: T): Response {
  const payload: ApiResponsePayload<T> = { status: 'success', message };
  if (data !== undefined) payload.data = data;
  return res.status(201).json(payload);
}

/** 204 No Content response (used for deletes) */
export function noContent(res: Response): Response {
  return res.status(204).send();
}

/** Generic paginated response wrapper */
export function paginated<T>(
  res: Response,
  data: T[],
  pagination: { page: number; limit: number; total: number },
): Response {
  return res.status(200).json({
    status: 'success',
    data,
    pagination: {
      ...pagination,
      totalPages: Math.ceil(pagination.total / pagination.limit),
    },
  });
}
