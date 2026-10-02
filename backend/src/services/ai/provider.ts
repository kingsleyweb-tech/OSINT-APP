/**
 * AI provider abstraction. The analysis engine only talks to this interface, so another provider or model
 * can be added without touching the engine. Provider and model come from the environment:
 *   AI_PROVIDER (default "gemini"), GEMINI_API_KEY, GEMINI_MODEL, GEMINI_FALLBACK_MODELS.
 * Keys are read here only; they are never logged, returned to the browser or put in error messages.
 */
import { GeminiProvider } from './geminiProvider';

export type AIErrorCode = 'not_configured' | 'rate_limited' | 'unavailable' | 'timeout' | 'bad_output' | 'blocked';

export class AIError extends Error {
  constructor(public code: AIErrorCode, message: string) {
    super(message);
  }
}

export interface GenerateOptions {
  /** Total time allowed for the call, retries included. */
  budgetMs: number;
}

export interface GenerateResult<T> {
  data: T;
  model: string;
}

export interface AIProvider {
  name: string;
  /** The primary model (fallbacks are only used when it is busy or unavailable). */
  model: string;
  configured(): boolean;
  generateJson<T>(system: string, prompt: string, schema: object, opts: GenerateOptions): Promise<GenerateResult<T>>;
}

export function getProvider(): AIProvider {
  const name = (process.env.AI_PROVIDER || 'gemini').trim().toLowerCase();
  switch (name) {
    case 'gemini':
    default:
      return new GeminiProvider();
  }
}
