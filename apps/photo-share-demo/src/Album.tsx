import { useRef, useState, type ChangeEvent } from 'react';
import { api, newId } from './api.ts';
import { prepareImage } from './image.ts';
import { uploadPhoto } from './upload.ts';
import { useTrip, type SyncState } from './useTrip.ts';
import { PhotoDetail } from './PhotoDetail.tsx';
import type { TripSnapshot } from '../shared/types.ts';

/** 本机上传队列里的一项。只有服务器确认后才会从这里移走、出现在共同相册。 */
interface Pending {
  id: string;
  name: string;
  status: 'preparing' | 'uploading' | 'failed';
  progress: number;
  error?: string;
  prepared?: { blob: Blob; width: number; height: number; previewUrl: string };
  file: File;
}

const SYNC_LABEL: Record<SyncState, string> = { live: '已连接', reconnecting: '重连中…', offline: '离线' };

export function Album({ initial, onSignedOut }: { initial: TripSnapshot; onSignedOut: () => void }) {
  const { snap, sync, refresh } = useTrip(initial, onSignedOut);
  const [pending, setPending] = useState<Pending[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const patch = (id: string, p: Partial<Pending>) =>
    setPending((list) => list.map((x) => (x.id === id ? { ...x, ...p } : x)));

  const run = async (item: Pending) => {
    try {
      let prepared = item.prepared;
      if (!prepared) {
        patch(item.id, { status: 'preparing', error: undefined });
        prepared = await prepareImage(item.file);
        patch(item.id, { prepared });
      }
      patch(item.id, { status: 'uploading', progress: 0, error: undefined });
      // 重试沿用同一个 id，服务器据此去重
      await uploadPhoto(item.id, prepared.blob, prepared.width, prepared.height, (r) => patch(item.id, { progress: r }));
      await refresh();
      setPending((list) => list.filter((x) => x.id !== item.id));
      URL.revokeObjectURL(prepared.previewUrl);
    } catch (e) {
      patch(item.id, { status: 'failed', error: e instanceof Error ? e.message : '上传失败' });
    }
  };

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    const items: Pending[] = files.map((file) => ({ id: newId(), name: file.name, status: 'preparing', progress: 0, file }));
    setPending((list) => [...items, ...list]);
    // 一张一张传，手机网络下比并发更稳
    void items.reduce((p, item) => p.then(() => run(item)), Promise.resolve());
  };

  const logout = async () => {
    await api.logout().catch(() => undefined);
    onSignedOut();
  };

  const nameOf = (id: string) => snap.members.find((m) => m.id === id)?.name ?? '已退出成员';
  const photos = [...snap.photos].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const open = photos.find((p) => p.id === openId);

  return (
    <div className="app">
      <header className="bar">
        <div>
          <h1>{snap.trip.name}</h1>
          <span className="muted small">{snap.members.map((m) => m.name).join(' · ')} · 我是 {snap.me.name}</span>
        </div>
        <div className="bar-right">
          <span className={`sync ${sync}`}>{SYNC_LABEL[sync]}</span>
          <button className="link" onClick={logout}>退出登录</button>
        </div>
      </header>

      {pending.length > 0 && (
        <ul className="pending">
          {pending.map((p) => (
            <li key={p.id}>
              {p.prepared ? <img src={p.prepared.previewUrl} alt="" /> : <div className="ph" />}
              <div className="pending-info">
                <span className="small">{p.name}</span>
                {p.status === 'preparing' && <span className="muted small">处理中…</span>}
                {p.status === 'uploading' && <progress value={p.progress} max={1} />}
                {p.status === 'failed' && <span className="error small">{p.error}（未共享）</span>}
              </div>
              {p.status === 'failed' && (
                <div className="pending-actions">
                  <button className="btn small" onClick={() => run(p)}>重试</button>
                  <button className="link small" onClick={() => setPending((l) => l.filter((x) => x.id !== p.id))}>放弃</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {photos.length === 0 && pending.length === 0 && <p className="center muted">还没有照片，点下方按钮上传第一张。</p>}

      <div className="grid">
        {photos.map((p) => {
          const notes = snap.notes.filter((n) => n.photoId === p.id).length;
          return (
            <button key={p.id} className="tile" onClick={() => setOpenId(p.id)}>
              <img src={`/api/photos/${p.id}`} alt={p.location || '照片'} loading="lazy" />
              {(notes > 0 || p.location) && <span className="badge">{p.location ? '📍' : ''}{notes > 0 ? `💬${notes}` : ''}</span>}
            </button>
          );
        })}
      </div>

      <button className="fab" onClick={() => fileInput.current?.click()}>＋ 上传照片</button>
      <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={onPick} />

      {open && <PhotoDetail photo={open} snap={snap} nameOf={nameOf} refresh={refresh} onClose={() => setOpenId(null)} />}
    </div>
  );
}
