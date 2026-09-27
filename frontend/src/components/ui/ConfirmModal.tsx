import React, { useState, useCallback, useRef, createContext, useContext } from 'react';
import { AlertCircle, Info } from 'lucide-react';
import '../../styles/ConfirmModal.css';

/* ─────────────────────────── Types ─────────────────────────── */

export interface ConfirmOptions {
  /** Modal title */
  title: string;
  /** Body text (can include HTML via dangerouslySetInnerHTML or just plain text) */
  message: string;
  /** Label for the primary (confirm) button */
  confirmLabel?: string;
  /** Label for the secondary (cancel) button */
  cancelLabel?: string;
  /** Optional hint text shown below the buttons */
  hint?: string;
  /** 'info' shows a cognac icon, 'warning' shows an amber/red icon */
  variant?: 'info' | 'warning';
}

type ResolveRef = ((value: boolean) => void) | null;

/* ───────────────────────── Context ─────────────────────────── */

interface ConfirmContextValue {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export const useConfirm = () => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used inside ConfirmProvider');
  return ctx.confirm;
};

/* ──────────────────────── Component ───────────────────────── */

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [exiting, setExiting] = useState(false);
  const resolveRef = useRef<ResolveRef>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>(resolve => {
      resolveRef.current = resolve;
      setExiting(false);
      setOptions(opts);
    });
  }, []);

  const close = useCallback((result: boolean) => {
    setExiting(true);
    setTimeout(() => {
      setOptions(null);
      setExiting(false);
      resolveRef.current?.(result);
      resolveRef.current = null;
    }, 160);
  }, []);

  const variant = options?.variant || 'info';

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}

      {options && (
        <div
          className={`cm-backdrop ${exiting ? 'cm-backdrop-exit' : ''}`}
          onClick={() => close(false)}
        >
          <div className="cm-modal" onClick={e => e.stopPropagation()}>
            {/* Icon */}
            <div className="cm-icon">
              {variant === 'warning'
                ? <AlertCircle size={22} />
                : <Info size={22} />
              }
            </div>

            {/* Title */}
            <h2>{options.title}</h2>

            {/* Body */}
            <p className="cm-body" dangerouslySetInnerHTML={{ __html: options.message }} />

            {/* Hint */}
            {options.hint && (
              <div className="cm-hint">
                <Info size={14} />
                <span>{options.hint}</span>
              </div>
            )}

            {/* Buttons */}
            <div className="cm-actions">
              <button className="cm-btn" onClick={() => close(false)}>
                {options.cancelLabel || 'Cancel'}
              </button>
              <button className="cm-btn cm-btn-primary" onClick={() => close(true)}>
                {options.confirmLabel || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};
