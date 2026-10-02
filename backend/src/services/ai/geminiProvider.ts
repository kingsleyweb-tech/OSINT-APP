/**
 * Google Gemini (AI Studio API) provider, called from the server only. The key goes in the
 * x-goog-api-key header — never in a URL, a log line or an error message.
 *
 * Requests ask for JSON that follows a schema, at low temperature. When the model is busy (429/503) or
 * no longer offered (404), the next model from GEMINI_FALLBACK_MODELS is tried, waiting for the delay
 * Google asks for when it gives one — all within the caller's time budget.
 */
import { AIError, type AIProvider, type GenerateOptions, type GenerateResult } from './provider';

const API = 'https://generativelanguage.googleapis.com/v1beta/models';
const env = (k: string) => (process.env[k] || '').trim().replace(/^(['"])(.*)\1$/, '$2');

/** Seconds Google asks to wait, from the RetryInfo detail ("13s") or the retry-after header. */
function retryDelayMs(body: any, header: string | null): number {
  const detail = Array.isArray(body?.error?.details) ? body.error.details.find((d: any) => typeof d?.retryDelay === 'string') : null;
  const s = detail ? parseFloat(detail.retryDelay) : header ? parseFloat(header) : NaN;
  return Number.isFinite(s) && s > 0 ? Math.min(s * 1000, 20_000) : 2_000;
}

export class GeminiProvider implements AIProvider {
  name = 'gemini';
  model = env('GEMINI_MODEL') || 'gemini-3.5-flash';
  private fallbacks = env('GEMINI_FALLBACK_MODELS').split(',').map(s => s.trim()).filter(Boolean);

  configured(): boolean {
    return Boolean(env('GEMINI_API_KEY'));
  }

  async generateJson<T>(system: string, prompt: string, schema: object, opts: GenerateOptions): Promise<GenerateResult<T>> {
    const key = env('GEMINI_API_KEY');
    if (!key) throw new AIError('not_configured', 'AI analysis is not set up on the server (GEMINI_API_KEY is missing).');

    const started = Date.now();
    const left = () => opts.budgetMs - (Date.now() - started);
    const models = [this.model, ...this.fallbacks.filter(m => m !== this.model)];
    let last: AIError = new AIError('unavailable', 'The AI service could not be reached.');

    for (let i = 0; i < models.length; i++) {
      const model = models[i];
      if (left() < 15_000) break;
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), left());
      try {
        const res = await fetch(`${API}/${encodeURIComponent(model)}:generateContent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json', responseSchema: schema, temperature: 0.1 }
          }),
          signal: ctrl.signal
        });
        const body: any = await res.json().catch(() => ({}));
        if (!res.ok) {
          const status = res.status;
          console.warn(`[ai/gemini] ${model} answered ${status} ${String(body?.error?.status || '')}`);
          if (status === 429) last = new AIError('rate_limited', 'The AI service is busy (rate limit). Try again in a minute.');
          else if (status === 503 || status === 500 || status === 404) last = new AIError('unavailable', 'The AI service is temporarily unavailable. Try again shortly.');
          else if (status === 400 || status === 401 || status === 403) {
            throw new AIError('not_configured', 'The AI service rejected the request (check the Gemini key and model on the server).');
          } else last = new AIError('unavailable', 'The AI service could not be reached.');
          // Busy or unavailable: wait as asked, then try the next model (or stop when out of time).
          if (i < models.length - 1 && status !== 404) await new Promise(r => setTimeout(r, Math.min(retryDelayMs(body, res.headers.get('retry-after')), Math.max(0, left() - 15_000))));
          continue;
        }
        const cand = body?.candidates?.[0];
        if (!cand) throw new AIError('blocked', 'The AI service returned no answer for this evidence.');
        const text = (cand.content?.parts || []).map((p: any) => (typeof p?.text === 'string' && !p.thought ? p.text : '')).join('');
        try {
          return { data: JSON.parse(text) as T, model: String(body.modelVersion || model) };
        } catch {
          throw new AIError('bad_output', 'The AI answer was not in the expected format. Try again.');
        }
      } catch (e) {
        if (e instanceof AIError) throw e;
        if ((e as Error)?.name === 'AbortError') throw new AIError('timeout', 'The AI analysis took too long and was stopped. Try again.');
        console.warn(`[ai/gemini] ${model} request failed: ${(e as Error)?.message}`);
        last = new AIError('unavailable', 'The AI service could not be reached.');
      } finally {
        clearTimeout(timer);
      }
    }
    throw last;
  }
}
