import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import '../../styles/Toast.css';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  toast: (opts: Omit<Toast, 'id'>) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
};

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={16} />,
  error: <XCircle size={16} />,
  warning: <AlertTriangle size={16} />,
  info: <Info size={16} />,
};

const ToastCard: React.FC<{ toast: Toast; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
  const [exiting, setExiting] = useState(false);
  const duration = toast.duration ?? 4000;

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => onRemove(toast.id), 350);
  }, [toast.id, onRemove]);

  React.useEffect(() => {
    const t = setTimeout(dismiss, duration);
    return () => clearTimeout(t);
  }, [dismiss, duration]);

  return (
    <div className={`toast-card toast-${toast.type} ${exiting ? 'toast-exit' : 'toast-enter'}`}>
      <div className={`toast-icon-wrap toast-icon-${toast.type}`}>
        {ICONS[toast.type]}
      </div>
      <div className="toast-content">
        <div className="toast-title">{toast.title}</div>
        {toast.message && <div className="toast-message">{toast.message}</div>}
      </div>
      <button className="toast-close-btn" onClick={dismiss} aria-label="Dismiss">
        <X size={14} />
      </button>
      <div
        className={`toast-progress toast-progress-${toast.type}`}
        style={{ animationDuration: `${duration}ms` }}
      />
    </div>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const add = useCallback((opts: Omit<Toast, 'id'>) => {
    const id = `toast-${++counter.current}`;
    setToasts(prev => [...prev, { ...opts, id }]);
  }, []);

  const remove = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const ctx: ToastContextValue = {
    toast: add,
    success: (title, message) => add({ type: 'success', title, message }),
    error: (title, message) => add({ type: 'error', title, message }),
    warning: (title, message) => add({ type: 'warning', title, message }),
    info: (title, message) => add({ type: 'info', title, message }),
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <div className="toast-portal">
        {toasts.map(t => (
          <ToastCard key={t.id} toast={t} onRemove={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};
