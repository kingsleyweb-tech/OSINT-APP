import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Database, ExternalLink, Loader2, Search, Shield, User } from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import { useNotifications } from '../../context/NotificationContext';
import { useSignOutPrompt } from '../../context/SignOutPromptContext';
import { useToast } from '../../components/ui/Toast';
import {
  authErrorMessage, changePassword, clearLocalSessionData, deleteAuthAccount, reauthenticate, resetPassword, signInMethods
} from '../../firebase/auth';
import { deleteAllInvestigationsFromDb, deleteAllUserDataFromDb, exportUserDataFromDb } from '../../firebase/firestore';
import { browserTimeZone, dateFormatExample } from '../../lib/session';
import { isValidPhone } from '../../lib/validation';
import {
  DEFAULT_NOTIFICATION_PREFS, DEFAULT_SEARCH_DEFAULTS, type DateFormatPref, type NotificationPrefs, type SearchDefaults
} from '../../types/user';
import '../../styles/Settings.css';

type Section = 'profile' | 'security' | 'notifications' | 'search' | 'data';

const SECTIONS: Array<{ key: Section; label: string; icon: React.ElementType }> = [
  { key: 'profile', label: 'Profile', icon: User },
  { key: 'security', label: 'Security', icon: Shield },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'search', label: 'Search defaults', icon: Search },
  { key: 'data', label: 'Data & privacy', icon: Database }
];

const ROLES = ['Investigator', 'Analyst', 'Researcher', 'Journalist', 'Compliance officer', 'Administrator'];

function timeZones(): string[] {
  try {
    const list = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.('timeZone');
    if (list && list.length) return list;
  } catch { /* older browser */ }
  return ['UTC', 'Africa/Accra', 'Africa/Lagos', 'Africa/Nairobi', 'Europe/London', 'Europe/Paris', 'America/New_York', 'America/Los_Angeles', 'Asia/Dubai', 'Asia/Kolkata', 'Asia/Singapore', 'Australia/Sydney'];
}

function tzLabel(tz: string): string {
  try {
    const part = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(new Date()).find(p => p.type === 'timeZoneName');
    return `${tz} (${(part?.value || 'GMT').replace(/^GMT$/, 'GMT+0')})`;
  } catch {
    return tz;
  }
}

/** Resizes an image file to a 256×256 JPEG data URL, small enough to store in the profile document. */
function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('The file is not a valid image.'));
      img.onload = () => {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Image processing is not available.'));
        const side = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

const initials = (name: string) => name.split(/\s+/).filter(Boolean).map(p => p[0]).join('').slice(0, 2).toUpperCase() || '?';

export const SettingsPage: React.FC = () => {
  const [section, setSection] = useState<Section>('profile');
  const active = SECTIONS.find(s => s.key === section)!;

  return (
    <div className="st-root">
      <header className="st-head">
        <div className="st-crumb">Workspace / Settings</div>
        <h1 className="st-title">Settings</h1>
        <p className="st-lead">Manage your profile, sign-in security, notifications and how new investigations run.</p>
      </header>
      <div className="st-body">
        <nav className="st-nav" aria-label="Settings sections">
          {SECTIONS.map(s => {
            const Icon = s.icon;
            return (
              <button key={s.key} type="button" className={section === s.key ? 'on' : ''} aria-current={section === s.key} onClick={() => setSection(s.key)}>
                <Icon size={19} /> {s.label}
              </button>
            );
          })}
        </nav>
        <div className="st-content" aria-label={active.label}>
          {section === 'profile' && <ProfileSection />}
          {section === 'security' && <SecuritySection />}
          {section === 'notifications' && <NotificationsSection />}
          {section === 'search' && <SearchSection />}
          {section === 'data' && <DataSection />}
        </div>
      </div>
    </div>
  );
};

const Card: React.FC<{ title: string; sub: string; children: React.ReactNode; footer?: React.ReactNode }> = ({ title, sub, children, footer }) => (
  <section className="st-card">
    <div className="st-card-head"><h2>{title}</h2><p>{sub}</p></div>
    <div className="st-card-body">{children}</div>
    {footer && <div className="st-card-foot">{footer}</div>}
  </section>
);

// ─── Profile ────────────────────────────────────────────────────────────────

interface ProfileForm {
  displayName: string;
  phoneNumber: string;
  role: string;
  organisation: string;
  timeZone: string;
  dateFormat: DateFormatPref;
  photoURL: string;
}

const ProfileSection: React.FC = () => {
  const { user, profile } = useSession();
  const initial: ProfileForm = {
    displayName: profile?.displayName || user?.displayName || '',
    phoneNumber: profile?.phoneNumber || '',
    role: profile?.role || 'Investigator',
    organisation: profile?.organisation || '',
    timeZone: profile?.timeZone || browserTimeZone(),
    dateFormat: profile?.dateFormat || 'dmy',
    photoURL: profile?.photoURL || ''
  };
  // Remount the form whenever the saved profile changes so it starts from the stored values.
  return <ProfileEditor key={JSON.stringify(initial)} initial={initial} />;
};

const ProfileEditor: React.FC<{ initial: ProfileForm }> = ({ initial }) => {
  const { user, updateProfile } = useSession();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const zones = useMemo(() => {
    const list = timeZones();
    return list.includes(form.timeZone) ? list : [form.timeZone, ...list];
  }, [form.timeZone]);

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  const pickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!/^image\/(png|jpe?g)$/.test(file.type)) return toast.error('Unsupported file', 'Choose a PNG or JPG image.');
    try {
      const photoURL = await resizeImage(file);
      setForm(f => ({ ...f, photoURL }));
    } catch (err) {
      toast.error('Photo not added', (err as Error).message);
    }
  };

  const save = async () => {
    if (!form.displayName.trim()) return toast.error('Name required', 'Enter your full name.');
    if (form.phoneNumber.trim() && !isValidPhone(form.phoneNumber)) return toast.error('Invalid phone number', 'Include the country code, e.g. +233 24 123 4567.');
    setSaving(true);
    try {
      await updateProfile({
        displayName: form.displayName.trim(),
        phoneNumber: form.phoneNumber.trim(),
        role: form.role,
        organisation: form.organisation.trim(),
        timeZone: form.timeZone,
        dateFormat: form.dateFormat,
        photoURL: form.photoURL || ''
      });
      toast.success('Profile saved', 'Your profile was saved to your account.');
    } catch (err) {
      toast.error('Not saved', authErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card
      title="Profile"
      sub="How you appear on investigations and the audit log."
      footer={(
        <>
          <button type="button" className="st-btn" onClick={() => setForm(initial)} disabled={!dirty || saving}>Cancel</button>
          <button type="button" className="st-btn st-primary" onClick={save} disabled={!dirty || saving}>
            {saving && <Loader2 size={16} className="st-spin" />} Save changes
          </button>
        </>
      )}
    >
      <div className="st-photo-row">
        <div className="st-avatar">{form.photoURL ? <img src={form.photoURL} alt="" /> : initials(form.displayName)}</div>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg" hidden onChange={pickPhoto} />
        <button type="button" className="st-btn" onClick={() => fileRef.current?.click()}>Upload photo</button>
        <button type="button" className="st-btn st-muted-btn" onClick={() => setForm(f => ({ ...f, photoURL: '' }))} disabled={!form.photoURL}>Remove</button>
        <span className="st-hint">PNG or JPG, at least 256 × 256 px.</span>
      </div>
      <div className="st-grid">
        <label className="st-field"><span>Full name</span><input value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })} /></label>
        <label className="st-field">
          <span>Email</span>
          <input value={user?.email || ''} placeholder="you@organisation.com" readOnly />
        </label>
        <label className="st-field">
          <span>Phone number</span>
          <input type="tel" value={form.phoneNumber} onChange={e => setForm({ ...form, phoneNumber: e.target.value })} placeholder="+233 24 123 4567" autoComplete="tel" inputMode="tel" />
        </label>
        <label className="st-field">
          <span>Role</span>
          <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
            {(ROLES.includes(form.role) ? ROLES : [form.role, ...ROLES]).map(r => <option key={r}>{r}</option>)}
          </select>
        </label>
        <label className="st-field"><span>Organisation</span><input value={form.organisation} onChange={e => setForm({ ...form, organisation: e.target.value })} placeholder="Organisation name" /></label>
        <label className="st-field">
          <span>Time zone</span>
          <select value={form.timeZone} onChange={e => setForm({ ...form, timeZone: e.target.value })}>
            {zones.map(z => <option key={z} value={z}>{tzLabel(z)}</option>)}
          </select>
        </label>
        <label className="st-field">
          <span>Date format</span>
          <select value={form.dateFormat} onChange={e => setForm({ ...form, dateFormat: e.target.value as DateFormatPref })}>
            {(['dmy', 'mdy', 'iso'] as DateFormatPref[]).map(f => <option key={f} value={f}>{dateFormatExample(f)}</option>)}
          </select>
        </label>
      </div>
      <p className="st-hint" style={{ marginTop: 10 }}>Used for activity timestamps and timelines.</p>
    </Card>
  );
};

// ─── Security ───────────────────────────────────────────────────────────────

const SecuritySection: React.FC = () => {
  const { user, profile } = useSession();
  const { promptSignOut } = useSignOutPrompt();
  const toast = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const methods = signInMethods();
  const lastSignIn = user?.lastSignInAt || profile?.lastLoginAt;

  if (!methods.includes('password')) {
    // Google accounts have no password here: Google holds the credentials.
    return (
      <Card
        title="Security"
        sub={`Signed in with Google as ${user?.email || 'your Google account'}.`}
        footer={<button type="button" className="st-btn" onClick={promptSignOut}>Sign out</button>}
      >
        <p className="st-text">
          Your password, two-step verification and recovery options are managed in your Google Account. This app never sees or stores your Google password.
        </p>
        <p className="st-hint" style={{ marginTop: 12 }}>
          <a className="st-link" href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer">
            Open Google Account security <ExternalLink size={13} />
          </a>
        </p>
        {lastSignIn && <p className="st-hint">Last sign-in: {new Date(lastSignIn).toLocaleString()}</p>}
      </Card>
    );
  }

  const change = async () => {
    if (next.length < 8) return toast.error('Password too short', 'Use at least 8 characters.');
    if (next !== confirm) return toast.error('Passwords differ', 'The new passwords do not match.');
    setBusy(true);
    try {
      await changePassword(current, next);
      setCurrent(''); setNext(''); setConfirm('');
      toast.success('Password changed', 'Use your new password next time you sign in.');
    } catch (err) {
      toast.error('Password not changed', authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const sendReset = async () => {
    if (!user?.email) return;
    try {
      await resetPassword(user.email);
      toast.success('Email sent', `A password reset link was sent to ${user.email}.`);
    } catch (err) {
      toast.error('Email not sent', authErrorMessage(err));
    }
  };

  return (
    <Card
      title="Security"
      sub={`Signed in as ${user?.email || 'unknown'}. Your password is held by Firebase Authentication and never stored in the database.`}
      footer={(
        <>
          <button type="button" className="st-btn" onClick={promptSignOut}>Sign out</button>
          <button type="button" className="st-btn st-primary" onClick={change} disabled={busy || !current || !next}>{busy && <Loader2 size={16} className="st-spin" />} Change password</button>
        </>
      )}
    >
      <div className="st-grid">
        <label className="st-field st-span"><span>Current password</span><input type="password" value={current} onChange={e => setCurrent(e.target.value)} autoComplete="current-password" /></label>
        <label className="st-field"><span>New password</span><input type="password" value={next} onChange={e => setNext(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" /></label>
        <label className="st-field"><span>Confirm new password</span><input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" /></label>
      </div>
      <p className="st-hint" style={{ marginTop: 12 }}>
        Forgot your current password? <button type="button" className="st-link" onClick={sendReset}>Email me a reset link</button>
      </p>
      {lastSignIn && <p className="st-hint">Last sign-in: {new Date(lastSignIn).toLocaleString()}</p>}
    </Card>
  );
};

// ─── Notifications ──────────────────────────────────────────────────────────

const NotificationsSection: React.FC = () => {
  const { profile, updateProfile } = useSession();
  const { notifications, clearAll } = useNotifications();
  const toast = useToast();
  const prefs: NotificationPrefs = { ...DEFAULT_NOTIFICATION_PREFS, ...(profile?.notificationPrefs || {}) };

  const toggle = async (key: keyof NotificationPrefs) => {
    try {
      await updateProfile({ notificationPrefs: { ...prefs, [key]: !prefs[key] } });
    } catch (err) {
      toast.error('Not saved', authErrorMessage(err));
    }
  };

  const rows: Array<{ key: keyof NotificationPrefs; title: string; text: string }> = [
    { key: 'investigationSaved', title: 'Investigation created', text: 'When you select an identity and a new investigation is saved.' },
    { key: 'rescanCompleted', title: 'Searches re-run', text: 'When re-running an investigation’s searches finishes, with what changed.' },
    { key: 'systemAlerts', title: 'Failures and alerts', text: 'When a re-run or another background task fails.' }
  ];

  return (
    <Card title="Notifications" sub="Notifications are saved to your account and appear under the bell icon on every device.">
      {rows.map(r => (
        <div key={r.key} className="st-toggle-row">
          <div><b>{r.title}</b><span>{r.text}</span></div>
          <button type="button" role="switch" aria-checked={prefs[r.key]} className={`st-switch${prefs[r.key] ? ' on' : ''}`} onClick={() => toggle(r.key)}><i /></button>
        </div>
      ))}
      <div className="st-toggle-row">
        <div><b>Stored notifications</b><span>{notifications.length} saved. Clearing deletes them from the database.</span></div>
        <button type="button" className="st-btn" disabled={notifications.length === 0} onClick={() => { clearAll(); toast.success('Cleared', 'All notifications were deleted.'); }}>Clear all</button>
      </div>
    </Card>
  );
};

// ─── Search defaults ────────────────────────────────────────────────────────

const DEPTHS: Array<{ key: SearchDefaults['depth']; title: string; text: string }> = [
  { key: 'quick', title: 'Quick', text: 'About 4–5 SerpApi searches per name search and 5 per username search.' },
  { key: 'standard', title: 'Standard', text: 'About 9–11 SerpApi searches per name search and 10 per username search.' },
  { key: 'deep', title: 'Deep', text: 'About 9–13 SerpApi searches per name search and 13 per username search. Best coverage.' }
];

const SearchSection: React.FC = () => {
  const { profile, updateProfile } = useSession();
  const toast = useToast();
  const saved: SearchDefaults = { ...DEFAULT_SEARCH_DEFAULTS, ...(profile?.searchDefaults || {}) };
  const [form, setForm] = useState(saved);
  const [saving, setSaving] = useState(false);
  const dirty = form.type !== saved.type || form.depth !== saved.depth || (form.mode || 'intelligent') !== (saved.mode || 'intelligent');

  const save = async () => {
    setSaving(true);
    try {
      await updateProfile({ searchDefaults: form });
      toast.success('Search defaults saved', 'New searches will use these settings.');
    } catch (err) {
      toast.error('Not saved', authErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card
      title="Search defaults"
      sub="How new investigations run. Each SerpApi search counts toward your monthly SerpApi quota."
      footer={(
        <>
          <button type="button" className="st-btn" onClick={() => setForm(saved)} disabled={!dirty || saving}>Cancel</button>
          <button type="button" className="st-btn st-primary" onClick={save} disabled={!dirty || saving}>{saving && <Loader2 size={16} className="st-spin" />} Save changes</button>
        </>
      )}
    >
      <div className="st-grid">
        <label className="st-field">
          <span>Default search type</span>
          <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as SearchDefaults['type'] })}>
            <option value="Name">Name / person</option>
            <option value="Username">Username</option>
          </select>
        </label>
      </div>
      <div className="st-field" style={{ marginTop: 18 }}><span>Search mode</span></div>
      <div className="st-options">
        {([
          ['intelligent', 'Intelligent', 'Checks the spelling first (1 extra SerpApi search, cached for 12 hours), suggests corrections such as "Kingley Anab" → "Kingsley Anaab", and searches a correction only when it is highly confident. The original stays visible.'],
          ['precise', 'Precise', 'Searches exactly what you type. No spelling check and no extra search.']
        ] as const).map(([key, title, text]) => (
          <label key={key} className={`st-option${(form.mode || 'intelligent') === key ? ' on' : ''}`}>
            <input type="radio" name="mode" checked={(form.mode || 'intelligent') === key} onChange={() => setForm({ ...form, mode: key })} />
            <div><b>{title}</b><span>{text}</span></div>
          </label>
        ))}
      </div>
      <div className="st-field" style={{ marginTop: 18 }}><span>Search depth</span></div>
      <div className="st-options">
        {DEPTHS.map(o => (
          <label key={o.key} className={`st-option${form.depth === o.key ? ' on' : ''}`}>
            <input type="radio" name="depth" checked={form.depth === o.key} onChange={() => setForm({ ...form, depth: o.key })} />
            <div><b>{o.title}</b><span>{o.text}</span></div>
          </label>
        ))}
      </div>
    </Card>
  );
};

// ─── Data & privacy ─────────────────────────────────────────────────────────

const DataSection: React.FC = () => {
  const { user } = useSession();
  const toast = useToast();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);
  const [password, setPassword] = useState('');

  if (!user) return null;

  const exportData = async () => {
    setBusy('export');
    try {
      const data = await exportUserDataFromDb(user.uid);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      a.download = `osint-account-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      toast.error('Export failed', authErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const deleteInvestigations = async () => {
    if (window.prompt('This permanently deletes all your investigations and tracked people. Type DELETE to confirm.') !== 'DELETE') return;
    setBusy('investigations');
    try {
      const n = await deleteAllInvestigationsFromDb(user.uid);
      clearLocalSessionData();
      toast.success('Investigations deleted', `${n} investigation${n === 1 ? '' : 's'} deleted.`);
    } catch (err) {
      toast.error('Delete failed', authErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const usesPassword = signInMethods().includes('password');

  const deleteAccount = async () => {
    if (usesPassword && !password) return toast.error('Password required', 'Enter your password to delete your account.');
    if (window.prompt('This permanently deletes your account and all its data. Type DELETE to confirm.') !== 'DELETE') return;
    setBusy('account');
    try {
      // Confirm identity first, delete the data while still signed in, then delete the login itself.
      // Password accounts confirm with their password; Google accounts confirm in Google's sign-in window.
      await reauthenticate(usesPassword ? password : undefined);
      await deleteAllUserDataFromDb(user.uid);
      await deleteAuthAccount();
      clearLocalSessionData();
      navigate('/');
    } catch (err) {
      toast.error('Account not deleted', authErrorMessage(err));
      setBusy(null);
    }
  };

  return (
    <Card title="Data & privacy" sub="Your data is stored in your own account. Other users cannot see your investigations, tracked people or notifications.">
      <div className="st-toggle-row">
        <div><b>Export my data</b><span>Download your profile, investigations, tracked people and notifications as a JSON file.</span></div>
        <button type="button" className="st-btn" onClick={exportData} disabled={busy !== null}>{busy === 'export' && <Loader2 size={16} className="st-spin" />} Export</button>
      </div>
      <div className="st-toggle-row">
        <div><b>Delete all investigations</b><span>Permanently removes every investigation and tracked person. Your account stays.</span></div>
        <button type="button" className="st-btn st-danger" onClick={deleteInvestigations} disabled={busy !== null}>{busy === 'investigations' && <Loader2 size={16} className="st-spin" />} Delete investigations</button>
      </div>
      <div className="st-toggle-row st-danger-zone">
        <div>
          <b>Delete account</b>
          <span>Permanently deletes your account and everything stored for it. This cannot be undone.</span>
          {usesPassword ? (
            <input className="st-inline-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" autoComplete="current-password" />
          ) : (
            <span>You will be asked to confirm with Google.</span>
          )}
        </div>
        <button type="button" className="st-btn st-danger" onClick={deleteAccount} disabled={busy !== null}>{busy === 'account' && <Loader2 size={16} className="st-spin" />} Delete account</button>
      </div>
    </Card>
  );
};
