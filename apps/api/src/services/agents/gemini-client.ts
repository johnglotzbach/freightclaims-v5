/**
 * Gemini API Client - Low-level wrapper for Google's Generative Language API
 *
 * Provides a typed interface for calling Gemini models with support for
 * system instructions, structured output (JSON mode), and streaming.
 * All agent code goes through this single client to keep API calls auditable.
 *
 * Location: apps/api/src/services/agents/gemini-client.ts
 */
import { env } from '../../config/env';
import { logger } from '../../utils/logger';

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

export interface GeminiPart {
  text?: string;
  inline_data?: { mime_type: string; data: string };
}

export interface GeminiMessage {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

export interface GeminiConfig {
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
  responseMimeType?: string;
}

interface GeminiCandidate {
  content: { parts: { text: string }[] };
  finishReason: string;
}

interface GeminiResponse {
  candidates: GeminiCandidate[];
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

/**
 * Sends a prompt to Gemini and returns the raw text response.
 * Retries once on 5xx errors with exponential backoff.
 */
export async function generateContent(
  prompt: string,
  options: {
    systemInstruction?: string;
    config?: GeminiConfig;
    model?: string;
  } = {},
): Promise<{ text: string; tokenUsage: { prompt: number; completion: number; total: number } }> {
  if (!env.GEMINI_API_KEY?.trim()) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const model = options.model || env.AI_MODEL;
  const url = `${BASE_URL}/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;

  const body: Record<string, unknown> = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: options.config?.temperature ?? 0.4,
      maxOutputTokens: options.config?.maxOutputTokens ?? 8192,
      topP: options.config?.topP ?? 0.95,
      ...(options.config?.responseMimeType && { responseMimeType: options.config.responseMimeType }),
    },
  };

  if (options.systemInstruction) {
    body.systemInstruction = { parts: [{ text: options.systemInstruction }] };
  }

  const start = Date.now();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60_000),
      });

      if (response.status >= 500 && attempt === 0) {
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Gemini ${response.status}: ${errBody}`);
      }

      const data = await response.json() as GeminiResponse;
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Empty Gemini response');

      const duration = Date.now() - start;
      const usage = data.usageMetadata;

      logger.debug(
        { model, duration, tokens: usage?.totalTokenCount },
        'Gemini call completed',
      );

      return {
        text,
        tokenUsage: {
          prompt: usage?.promptTokenCount ?? 0,
          completion: usage?.candidatesTokenCount ?? 0,
          total: usage?.totalTokenCount ?? 0,
        },
      };
    } catch (err) {
      lastError = err as Error;
      if (attempt === 0) {
        logger.warn({ err }, 'Gemini call failed, retrying...');
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  throw lastError || new Error('Gemini call failed');
}

/**
 * Multi-turn conversation with Gemini (for copilot chat).
 * Accepts a history of messages and returns the model's next reply.
 */
export async function chat(
  messages: GeminiMessage[],
  options: {
    systemInstruction?: string;
    config?: GeminiConfig;
    model?: string;
  } = {},
): Promise<string> {
  if (!env.GEMINI_API_KEY?.trim()) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const model = options.model || env.AI_MODEL;
  const url = `${BASE_URL}/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;

  const body: Record<string, unknown> = {
    contents: messages,
    generationConfig: {
      temperature: options.config?.temperature ?? 0.7,
      maxOutputTokens: options.config?.maxOutputTokens ?? 4096,
      topP: options.config?.topP ?? 0.95,
    },
  };

  if (options.systemInstruction) {
    body.systemInstruction = { parts: [{ text: options.systemInstruction }] };
  }

  const start = Date.now();
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    const errBody = await response.text();
    logger.error({ status: response.status, errBody, model }, 'Gemini chat API error');
    throw new Error(`Gemini ${response.status}: ${errBody}`);
  }

  const data = await response.json() as GeminiResponse;
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  logger.debug({ model, duration: Date.now() - start, hasText: !!text }, 'Gemini chat completed');

  if (!text?.trim()) {
    const reason = data.candidates?.[0]?.finishReason;
    logger.warn({ reason, model }, 'Gemini returned empty response');
    throw new Error(`Gemini returned empty response (reason: ${reason || 'unknown'})`);
  }

  return text;
}

/**
 * Calls Gemini expecting a JSON response. Parses and returns the object.
 * Uses responseMimeType: "application/json" to enforce structured output.
 */
export async function generateJSON<T = Record<string, unknown>>(
  prompt: string,
  options: {
    systemInstruction?: string;
    model?: string;
  } = {},
): Promise<T> {
  const { text } = await generateContent(prompt, {
    ...options,
    config: { responseMimeType: 'application/json', temperature: 0.2 },
  });

  const cleaned = text.replace(/^```json\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
  return JSON.parse(cleaned) as T;
}

/**
 * Sends multimodal content (text + images/files) to Gemini and returns
 * structured JSON. Used for image-based document analysis (damage photos, etc.).
 */
export async function generateMultimodalJSON<T = Record<string, unknown>>(
  parts: GeminiPart[],
  options: {
    systemInstruction?: string;
    model?: string;
  } = {},
): Promise<T> {
  if (!env.GEMINI_API_KEY?.trim()) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const model = options.model || env.AI_MODEL;
  const url = `${BASE_URL}/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;

  const body: Record<string, unknown> = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 8192,
      topP: 0.95,
      responseMimeType: 'application/json',
    },
  };

  if (options.systemInstruction) {
    body.systemInstruction = { parts: [{ text: options.systemInstruction }] };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(90_000),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Gemini ${response.status}: ${errBody}`);
  }

  const data = await response.json() as GeminiResponse;
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty Gemini multimodal response');

  const cleaned = text.replace(/^```json\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
  return JSON.parse(cleaned) as T;
}
