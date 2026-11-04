// 旅行本数据：以服务器快照为准。实时通知、回到前台、网络恢复时都重新拉取。
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiFailure } from './api.ts';
import type { TripSnapshot } from '../shared/types.ts';

export type SyncState = 'live' | 'reconnecting' | 'offline';

export function useTrip(initial: TripSnapshot, onSignedOut: () => void) {
  const [snap, setSnap] = useState(initial);
  const [sync, setSync] = useState<SyncState>('live');
  const latest = useRef(initial.version);

  const refresh = useCallback(async () => {
    try {
      const s = await api.snapshot();
      if (s.version >= latest.current) {
        latest.current = s.version;
        setSnap(s);
      }
    } catch (e) {
      if (e instanceof ApiFailure && e.status === 401) onSignedOut();
    }
  }, [onSignedOut]);

  useEffect(() => {
    let es: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      es?.close();
      es = new EventSource('/api/events');
      es.onopen = () => setSync('live');
      es.onmessage = (e) => {
        if (Number(e.data) > latest.current) void refresh();
      };
      es.onerror = () => {
        setSync(navigator.onLine ? 'reconnecting' : 'offline');
        es?.close();
        clearTimeout(retry);
        retry = setTimeout(connect, 3000);
      };
    };

    // 手机锁屏或切后台时连接常被系统掐断；回来时重连并主动对账，不只依赖实时通知。
    const onVisible = () => {
      if (document.visibilityState === 'visible') { connect(); void refresh(); }
    };
    const onOnline = () => { connect(); void refresh(); };
    const onOffline = () => setSync('offline');

    connect();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      es?.close();
      clearTimeout(retry);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [refresh]);

  return { snap, sync, refresh };
}
