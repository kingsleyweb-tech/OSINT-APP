import { useState, useEffect, useRef } from 'react';
import type { DiscoveryResultItem, UsernameDiscoverySummary } from '../types/discovery';

interface UseUsernameDiscoveryProps {
  username: string;
  enabled: boolean;
  debounceMs?: number;
}

export const useUsernameDiscovery = ({
  username,
  enabled,
  debounceMs = 450
}: UseUsernameDiscoveryProps) => {
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [itemsMap, setItemsMap] = useState<Record<string, DiscoveryResultItem>>({});
  const [summary, setSummary] = useState<UsernameDiscoverySummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);

  // 1. Debounce logic
  useEffect(() => {
    if (!enabled) {
      setDebouncedQuery('');
      return;
    }

    const cleaned = username.trim();
    if (cleaned.length < 3) {
      setDebouncedQuery('');
      setItemsMap({});
      setSummary(null);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(() => {
      setDebouncedQuery(cleaned);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [username, enabled, debounceMs]);

  // 2. Connect to SSE Stream when debouncedQuery changes
  useEffect(() => {
    if (!debouncedQuery || !enabled) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      return;
    }

    // Reset state for new query
    setIsSearching(true);
    setItemsMap({});
    setSummary(null);
    setError(null);

    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const streamUrl = `${apiBase}/username-discovery/stream?username=${encodeURIComponent(debouncedQuery)}`;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(streamUrl);
    eventSourceRef.current = eventSource;

    eventSource.addEventListener('platform_update', (event) => {
      try {
        const item: DiscoveryResultItem = JSON.parse(event.data);
        setItemsMap(prev => ({
          ...prev,
          [item.id]: item
        }));
      } catch (e) {
        console.error('Failed to parse platform update event:', e);
      }
    });

    eventSource.addEventListener('discovery_complete', (event) => {
      try {
        const sumData: UsernameDiscoverySummary = JSON.parse(event.data);
        setSummary(sumData);
      } catch (e) {}
      setIsSearching(false);
      eventSource.close();
    });

    eventSource.addEventListener('discovery_error', (event) => {
      try {
        const errData = JSON.parse(event.data);
        setError(errData.error || 'Discovery failed');
      } catch (e) {}
      setIsSearching(false);
      eventSource.close();
    });

    eventSource.onerror = () => {
      setIsSearching(false);
      eventSource.close();
    };

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [debouncedQuery, enabled]);

  const itemsList = Object.values(itemsMap);
  const foundCount = itemsList.filter(i => i.status === 'found' && !i.isVariation).length;
  const checkedCount = itemsList.filter(i => i.status !== 'searching').length;

  return {
    debouncedQuery,
    isSearching,
    items: itemsList,
    summary,
    error,
    foundCount,
    checkedCount
  };
};
