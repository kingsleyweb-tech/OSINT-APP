import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AtSign, BookmarkX, Calendar, Globe, Loader2, MapPin, Search, User, Users } from 'lucide-react';
import {
  getUserInvestigationsFromDb, subscribeToTrackedPeople, trackPersonInDb, untrackPersonInDb, type TrackedPerson
} from '../../firebase/firestore';
import { useToast } from '../../components/ui/Toast';
import { formatDate } from '../../lib/session';
import '../../styles/People.css';

interface PeoplePageProps {
  currentUser?: { uid: string };
}

const initialsOf = (name: string) =>
  name.replace(/^@/, '').split(/\s+/).filter(Boolean).map(p => p[0]).join('').slice(0, 2).toUpperCase() || '?';

/** Everyone the signed-in user tracks, from Firestore trackedPeople (one record per tracked investigation). */
export const PeoplePage: React.FC<PeoplePageProps> = ({ currentUser }) => {
  const navigate = useNavigate();
  const toast = useToast();
  const userId = currentUser?.uid || '';
  const [people, setPeople] = useState<TrackedPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const migrated = useRef(false);

  useEffect(() => {
    if (!userId) return undefined;
    return subscribeToTrackedPeople(
      userId,
      list => {
        setPeople(list);
        setLoading(false);
      },
      err => {
        console.error('Tracked people listener error:', err);
        setLoading(false);
      }
    );
  }, [userId]);

  // Investigations tracked before trackedPeople existed get their record once.
  useEffect(() => {
    if (!userId || loading || migrated.current) return;
    migrated.current = true;
    const known = new Set(people.map(p => p.investigationId));
    getUserInvestigationsFromDb(userId).then(list => {
      list.filter(inv => inv.isTracked && !known.has(inv.id)).forEach(inv => trackPersonInDb(inv).catch(() => undefined));
    });
  }, [userId, loading, people]);

  const untrack = async (p: TrackedPerson, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await untrackPersonInDb(p.investigationId);
      toast.success('Tracking stopped', `${p.name} was removed from People.`);
    } catch {
      toast.error('Not saved', 'Tracking could not be updated.');
    }
  };

  const open = (p: TrackedPerson) => navigate(`/investigations/${p.investigationId}`);

  const q = query.trim().toLowerCase();
  const visible = people.filter(p => !q || `${p.name} ${p.location || ''} ${p.occupation || ''}`.toLowerCase().includes(q));

  return (
    <div className="people-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">People</h1>
          <p className="page-subtitle">
            {loading ? 'Loading tracked people…' : `${people.length} tracked ${people.length === 1 ? 'person' : 'people'}`}
          </p>
        </div>
        {people.length > 0 && (
          <div className="people-search">
            <Search size={15} />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search tracked people" aria-label="Search tracked people" />
          </div>
        )}
      </div>

      {loading ? (
        <div className="empty-people-state"><Loader2 className="empty-icon spinning-people" size={32} /><h3>Loading…</h3></div>
      ) : people.length === 0 ? (
        <div className="empty-people-state">
          <Users className="empty-icon" size={40} />
          <h3>No tracked people yet</h3>
          <p>Open an investigation and choose <b>Track person</b>. The person will appear here.</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="empty-people-state"><h3>No tracked person matches "{query}"</h3></div>
      ) : (
        <div className="people-grid">
          {visible.map(p => {
            const isUsername = p.searchType === 'username';
            return (
              <div
                key={p.investigationId}
                className="person-card"
                role="button"
                tabIndex={0}
                onClick={() => open(p)}
                onKeyDown={e => e.key === 'Enter' && open(p)}
              >
                <div className="person-card-top">
                  <div className="person-avatar">
                    {p.avatarUrl ? <img src={p.avatarUrl} alt="" referrerPolicy="no-referrer" /> : initialsOf(p.name)}
                  </div>
                  <button type="button" className="person-untrack" onClick={e => untrack(p, e)} title="Stop tracking">
                    <BookmarkX size={15} /> Untrack
                  </button>
                </div>
                <div className="person-name">{isUsername ? `@${p.name.replace(/^@/, '')}` : p.name}</div>
                <div className="person-role">{p.occupation || (isUsername ? 'Username investigation' : 'Person investigation')}</div>
                <div className="person-details-list">
                  {p.location && <div className="detail-item"><MapPin size={14} className="detail-icon" />{p.location}</div>}
                  <div className="detail-item">
                    {isUsername ? <AtSign size={14} className="detail-icon" /> : <User size={14} className="detail-icon" />}
                    {p.profilesCount} profile{p.profilesCount === 1 ? '' : 's'}
                  </div>
                  <div className="detail-item"><Globe size={14} className="detail-icon" />{p.sourcesCount} source{p.sourcesCount === 1 ? '' : 's'}</div>
                  <div className="detail-item"><Calendar size={14} className="detail-icon" />Tracked {formatDate(p.trackedAt)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
