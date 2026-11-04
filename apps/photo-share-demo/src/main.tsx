import { StrictMode, useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { api, ApiFailure } from './api.ts';
import { Login } from './Login.tsx';
import { Album } from './Album.tsx';
import type { TripSnapshot } from '../shared/types.ts';
import './styles.css';

type Boot = { kind: 'loading' } | { kind: 'signedOut' } | { kind: 'error'; message: string } | { kind: 'ready'; snap: TripSnapshot };

function App() {
  const [boot, setBoot] = useState<Boot>({ kind: 'loading' });

  const load = useCallback(() => {
    setBoot({ kind: 'loading' });
    api.snapshot()
      .then((snap) => setBoot({ kind: 'ready', snap }))
      .catch((e: unknown) => {
        if (e instanceof ApiFailure && e.status === 401) setBoot({ kind: 'signedOut' });
        else setBoot({ kind: 'error', message: e instanceof Error ? e.message : '加载失败' });
      });
  }, []);

  useEffect(load, [load]);
  const signedOut = useCallback(() => setBoot({ kind: 'signedOut' }), []);

  switch (boot.kind) {
    case 'loading':
      return <div className="center muted">加载中…</div>;
    case 'error':
      return (
        <div className="center">
          <p>{boot.message}</p>
          <button className="btn" onClick={load}>重试</button>
        </div>
      );
    case 'signedOut':
      return <Login onDone={(snap) => setBoot({ kind: 'ready', snap })} />;
    case 'ready':
      // key 绑定账号：切换账号时整棵组件树重建，不残留上一账号的界面状态。
      return <Album key={boot.snap.me.id} initial={boot.snap} onSignedOut={signedOut} />;
  }
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
