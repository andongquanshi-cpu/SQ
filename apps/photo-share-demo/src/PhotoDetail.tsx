import { useState, type FormEvent } from 'react';
import { api, ApiFailure, newId } from './api.ts';
import type { Photo, TripSnapshot } from '../shared/types.ts';

interface Props {
  photo: Photo;
  snap: TripSnapshot;
  nameOf: (id: string) => string;
  refresh: () => Promise<void>;
  onClose: () => void;
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function PhotoDetail({ photo, snap, nameOf, refresh, onClose }: Props) {
  const [noteText, setNoteText] = useState('');
  // 备注 ID 在输入时就定下，提交失败重试仍用同一个，成功后才换新 ID
  const [noteId, setNoteId] = useState(newId);
  const [tagText, setTagText] = useState('');
  const [editingLoc, setEditingLoc] = useState(false);
  const [locText, setLocText] = useState(photo.location);
  const [locBase, setLocBase] = useState(photo.locationVersion);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const notes = snap.notes.filter((n) => n.photoId === photo.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const mine = photo.uploaderId === snap.me.id;

  const act = async (fn: () => Promise<unknown>): Promise<boolean> => {
    setBusy(true);
    setError('');
    try {
      await fn();
      await refresh();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失败');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const submitNote = async (e: FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    if (await act(() => api.addNote(photo.id, noteId, noteText))) {
      setNoteText('');
      setNoteId(newId());
    }
  };

  const startEditLoc = () => {
    setLocText(photo.location);
    setLocBase(photo.locationVersion);
    setNotice('');
    setEditingLoc(true);
  };

  /** 地点冲突：保留自己输入的内容，告诉用户对方改成了什么；再点一次保存才会覆盖。 */
  const saveLoc = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.setLocation(photo.id, locText, locBase);
      await refresh();
      setEditingLoc(false);
      setNotice('');
    } catch (err) {
      if (err instanceof ApiFailure && err.code === 'conflict' && err.current) {
        const cur = err.current as { location: string; locationVersion: number };
        setLocBase(cur.locationVersion);
        setNotice(`对方刚把地点改成「${cur.location || '空'}」。你的输入还在，确认要用你的就再点保存。`);
        await refresh();
      } else {
        setError(err instanceof Error ? err.message : '保存失败');
      }
    } finally {
      setBusy(false);
    }
  };

  const submitTag = async (e: FormEvent) => {
    e.preventDefault();
    if (!tagText.trim()) return;
    if (await act(() => api.addTag(photo.id, tagText))) setTagText('');
  };

  const removePhoto = async () => {
    if (!confirm('删除这张照片？对方也会看不到。')) return;
    if (await act(() => api.deletePhoto(photo.id))) onClose();
  };

  return (
    <div className="sheet" role="dialog" aria-modal="true">
      <header className="bar">
        <button className="link" onClick={onClose}>‹ 返回</button>
        {mine && <button className="link danger" onClick={removePhoto} disabled={busy}>删除照片</button>}
      </header>

      <a href={`/api/photos/${photo.id}`} target="_blank" rel="noreferrer" className="full">
        <img src={`/api/photos/${photo.id}`} alt={photo.location || '照片'} width={photo.width} height={photo.height} />
      </a>
      <p className="muted small">{nameOf(photo.uploaderId)} 上传于 {fmt(photo.createdAt)} · 点图片看原图</p>

      {error && <p className="error">{error}</p>}

      <section>
        <h2>地点</h2>
        {editingLoc ? (
          <form className="row" onSubmit={saveLoc}>
            <input value={locText} onChange={(e) => setLocText(e.target.value)} maxLength={60} placeholder="例如：野泽温泉 大汤" autoFocus />
            <button className="btn primary" disabled={busy}>保存</button>
            <button type="button" className="link" onClick={() => { setEditingLoc(false); setNotice(''); }}>取消</button>
          </form>
        ) : (
          <div className="row">
            <span>{photo.location ? `📍 ${photo.location}` : <span className="muted">还没填</span>}</span>
            {photo.locationUpdatedBy && <span className="muted small">（{nameOf(photo.locationUpdatedBy)} 填写）</span>}
            <button className="link" onClick={startEditLoc}>{photo.location ? '修改' : '添加'}</button>
          </div>
        )}
        {notice && <p className="notice small">{notice}</p>}
      </section>

      <section>
        <h2>标签</h2>
        <div className="tags">
          {photo.tags.map((t) => (
            <span key={t.text} className="tag" title={`${nameOf(t.addedBy)} 添加`}>
              #{t.text}
              <button className="link small" aria-label={`移除标签 ${t.text}`} disabled={busy}
                onClick={() => act(() => api.removeTag(photo.id, t.text))}>×</button>
            </span>
          ))}
        </div>
        <form className="row" onSubmit={submitTag}>
          <input value={tagText} onChange={(e) => setTagText(e.target.value)} maxLength={20} placeholder="加标签，例如：温泉" />
          <button className="btn" disabled={busy || !tagText.trim()}>添加</button>
        </form>
      </section>

      <section>
        <h2>备注</h2>
        {notes.length === 0 && <p className="muted small">还没有备注。</p>}
        <ul className="notes">
          {notes.map((n) => (
            <li key={n.id}>
              <div className="muted small">
                {nameOf(n.authorId)} · {fmt(n.createdAt)}
                {n.authorId === snap.me.id && (
                  <button className="link small" disabled={busy} onClick={() => act(() => api.deleteNote(n.id))}>删除</button>
                )}
              </div>
              <p>{n.text}</p>
            </li>
          ))}
        </ul>
        <form className="col" onSubmit={submitNote}>
          <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} maxLength={500} rows={3} placeholder="写点什么…" />
          <button className="btn primary" disabled={busy || !noteText.trim()}>{busy ? '提交中…' : '添加备注'}</button>
        </form>
      </section>
    </div>
  );
}
