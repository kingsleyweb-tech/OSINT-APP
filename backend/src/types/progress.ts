/** Live progress of a multi-source search, streamed to the page's loader. */
export interface ProgressStep {
  id: string;
  label: string;
}

export type SearchProgressEvent =
  | { type: 'plan'; steps: ProgressStep[] }
  | { type: 'step'; id: string; status: 'done' | 'empty' | 'failed' | 'cached'; count?: number; note?: string }
  | { type: 'add'; steps: ProgressStep[] };

export type ProgressCallback = (event: SearchProgressEvent) => void;
