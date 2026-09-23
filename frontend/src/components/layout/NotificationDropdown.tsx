import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, FileText, Link2, BellOff, X, Bell, Trash2 } from 'lucide-react';
import { useNotifications, type NotificationItem } from '../../context/NotificationContext';
import { PlatformIcon } from '../ui/PlatformIcon';
import '../../styles/NotificationDropdown.css';

interface NotificationDropdownProps {
  onClose: () => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ onClose }) => {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead, dismissNotification, clearAll } = useNotifications();

  const handleNotificationClick = (item: NotificationItem) => {
    markAsRead(item.id);
    onClose();
    if (item.targetInvestigationId) {
      navigate(`/investigations/${item.targetInvestigationId}`);
    } else {
      navigate('/investigations');
    }
  };

  const renderIcon = (item: NotificationItem) => {
    if (item.platform && !['File', 'Association', 'Check', 'System'].includes(item.platform)) {
      return <PlatformIcon platform={item.platform} size={16} />;
    }

    switch (item.type) {
      case 'profile_found':
        return <PlatformIcon platform={item.platform || 'Globe'} size={16} />;
      case 'source_added':
        return <Link2 size={15} className="notif-icon association" />;
      case 'investigation_saved':
      case 'investigation_updated':
        return <FileText size={15} className="notif-icon file" />;
      case 'association_found':
        return <Link2 size={15} className="notif-icon association" />;
      case 'scan_completed':
        return <CheckCircle2 size={15} className="notif-icon check" />;
      case 'scan_failed':
        return <X size={15} className="notif-icon error" />;
      default:
        return <Bell size={15} className="notif-icon default" />;
    }
  };

  const getTypeLabel = (type: NotificationItem['type']) => {
    switch (type) {
      case 'profile_found': return 'Profile';
      case 'source_added': return 'Source';
      case 'investigation_saved': return 'Saved';
      case 'investigation_updated': return 'Updated';
      case 'association_found': return 'Association';
      case 'scan_completed': return 'Scan';
      case 'scan_failed': return 'Failed';
      default: return 'Event';
    }
  };

  return (
    <div className="notification-dropdown-panel" onClick={(e) => e.stopPropagation()}>
      {/* Header */}
      <div className="notif-header">
        <div className="notif-title-row">
          <Bell size={15} className="notif-header-icon" />
          <h3 className="notif-title">
            Notifications
            {unreadCount > 0 && (
              <span className="notif-count-pill">{unreadCount}</span>
            )}
          </h3>
        </div>
        <div className="notif-header-actions">
          {notifications.some(n => !n.read) && (
            <button className="mark-all-read-btn" onClick={markAllAsRead} title="Mark all as read">
              Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button className="clear-all-btn" onClick={clearAll} title="Clear all notifications">
              <Trash2 size={13} />
            </button>
          )}
          <button className="notif-close-btn" onClick={onClose} aria-label="Close notifications">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Notification List */}
      <div className="notif-list">
        {notifications.length > 0 ? (
          notifications.map((item) => (
            <div
              key={item.id}
              className={`notif-item-row ${!item.read ? 'unread' : ''}`}
              onClick={() => handleNotificationClick(item)}
            >
              <div className={`notif-icon-badge type-${item.type}`}>
                {renderIcon(item)}
              </div>

              <div className="notif-content">
                <div className="notif-item-top">
                  <span className="notif-item-title">{item.title}</span>
                  <span className="notif-timestamp">{item.timestamp}</span>
                </div>
                <p className="notif-message">{item.message}</p>
                <span className={`notif-type-tag type-${item.type}`}>{getTypeLabel(item.type)}</span>
              </div>

              {!item.read && <span className="notif-unread-dot" />}

              <button
                className="notif-dismiss-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  dismissNotification(item.id);
                }}
                title="Dismiss"
              >
                <X size={12} />
              </button>
            </div>
          ))
        ) : (
          <div className="notif-empty-state">
            <div className="notif-empty-icon-ring">
              <BellOff size={22} />
            </div>
            <span className="notif-empty-title">All caught up</span>
            <p className="empty-subtext">Notifications from your investigations will appear here.</p>
          </div>
        )}
      </div>

      {notifications.length > 0 && (
        <div className="notif-footer">
          <button className="notif-view-all-btn" onClick={() => { navigate('/investigations'); onClose(); }}>
            View all investigations
          </button>
        </div>
      )}
    </div>
  );
};
