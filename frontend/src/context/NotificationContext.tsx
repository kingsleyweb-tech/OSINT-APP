import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  addNotificationToDb, deleteAllNotificationsFromDb, deleteNotificationFromDb, markAllNotificationsReadInDb,
  markNotificationReadInDb, subscribeToNotifications, type StoredNotification
} from '../firebase/firestore';
import { formatTime, formatShortDate } from '../lib/session';
import { DEFAULT_NOTIFICATION_PREFS } from '../types/user';
import { useSession } from './SessionContext';

export interface NotificationItem {
  id: string;
  type: 'profile_found' | 'source_added' | 'investigation_updated' | 'association_found' | 'scan_completed' | 'scan_failed' | 'investigation_saved' | 'system_alert';
  title: string;
  message: string;
  /** Display time, e.g. "14:32" today or "24 Sep" for older ones. */
  timestamp: string;
  createdAt: string;
  read: boolean;
  targetInvestigationId?: string;
  platform?: string;
}

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  dismissNotification: (id: string) => void;
  clearAll: () => void;
  addNotification: (item: Omit<NotificationItem, 'id' | 'timestamp' | 'createdAt' | 'read'>) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

function displayTime(iso: string): string {
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString() ? formatTime(iso) : formatShortDate(iso);
}

/** Notifications live in Firestore at users/{uid}/notifications, so they survive refreshes and devices. */
export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useSession();
  const uid = user?.uid;
  // Tagged with the uid they belong to, so a previous user's notifications are never shown after switching accounts.
  const [snapshot, setSnapshot] = useState<{ uid: string; items: StoredNotification[] } | null>(null);
  const stored = useMemo(() => (snapshot && snapshot.uid === uid ? snapshot.items : []), [snapshot, uid]);

  useEffect(() => {
    if (!uid) return undefined;
    return subscribeToNotifications(uid, items => setSnapshot({ uid, items }), err => console.error('Notification listener error:', err));
  }, [uid]);

  const notifications: NotificationItem[] = useMemo(
    () => stored.map(n => ({ ...n, type: n.type as NotificationItem['type'], timestamp: displayTime(n.createdAt) })),
    [stored]
  );
  const unreadCount = notifications.filter(n => !n.read).length;

  const report = (err: unknown) => console.error('Notification update failed:', err);

  const markAsRead = useCallback((id: string) => {
    if (uid) markNotificationReadInDb(uid, id).catch(report);
  }, [uid]);

  const markAllAsRead = useCallback(() => {
    const unread = stored.filter(n => !n.read).map(n => n.id);
    if (uid && unread.length) markAllNotificationsReadInDb(uid, unread).catch(report);
  }, [uid, stored]);

  const dismissNotification = useCallback((id: string) => {
    if (uid) deleteNotificationFromDb(uid, id).catch(report);
  }, [uid]);

  const clearAll = useCallback(() => {
    if (uid) deleteAllNotificationsFromDb(uid).catch(report);
  }, [uid]);

  const addNotification = useCallback((item: Omit<NotificationItem, 'id' | 'timestamp' | 'createdAt' | 'read'>) => {
    if (!uid) return;
    const prefs = { ...DEFAULT_NOTIFICATION_PREFS, ...(profile?.notificationPrefs || {}) };
    if (item.type === 'investigation_saved' && !prefs.investigationSaved) return;
    if (item.type === 'scan_completed' && !prefs.rescanCompleted) return;
    if ((item.type === 'system_alert' || item.type === 'scan_failed') && !prefs.systemAlerts) return;
    addNotificationToDb(uid, {
      ...item,
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
      read: false
    }).catch(report);
  }, [uid, profile?.notificationPrefs]);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, dismissNotification, clearAll, addNotification }}>
      {children}
    </NotificationContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within a NotificationProvider');
  return context;
};
