import React, { useEffect } from 'react';
import { Clock } from 'lucide-react';
import { WARN_BEFORE_MS, formatClock } from '../../lib/idle';
import '../../styles/Toast.css';

interface IdleWarningProps {
  /** Milliseconds left before the automatic sign-out. */
  remaining: number;
  onStay: () => void;
}

/** Live "you will be signed out" toast. It is removed by the parent as soon as the user is active again. */
export const IdleWarning: React.FC<IdleWarningProps> = ({ remaining, onStay }) => {
  const clock = formatClock(remaining);
  const seconds = Math.ceil(remaining / 1000);

  // The tab title shows the countdown too, so it is visible from another tab.
  useEffect(() => {
    const original = document.title;
    return () => { document.title = original; };
  }, []);
  useEffect(() => {
    document.title = `(${clock}) Signing out soon`;
  }, [clock]);

  // Screen readers hear the warning once, then only each full minute and the last 10 seconds.
  const announce = seconds % 60 === 0 || seconds <= 10;

  return (
    <div className="toast-portal idle-portal">
      <div className="toast-card toast-warning toast-enter idle-toast" role="alert" aria-live="assertive" aria-atomic="true">
        <div className="toast-icon-wrap toast-icon-warning"><Clock size={16} /></div>
        <div className="toast-content">
          <div className="toast-title">Still there?</div>
          <div className="toast-message">
            For your security the dashboard will sign you out in <strong className="idle-clock" aria-hidden="true">{clock}</strong>
            <span className="idle-sr">{announce ? ` ${clock} minutes` : ''}</span> because of inactivity.
            Move your mouse or press any key to stay signed in.
          </div>
          <button type="button" className="idle-stay" onClick={onStay}>Stay signed in</button>
        </div>
        <div
          className="toast-progress toast-progress-warning idle-progress"
          style={{ width: `${Math.max(0, Math.min(100, (remaining / WARN_BEFORE_MS) * 100))}%` }}
        />
      </div>
    </div>
  );
};
