import { useState, type FormEvent } from 'react';
import { api } from './api.ts';
import type { TripSnapshot } from '../shared/types.ts';

export function Login({ onDone }: { onDone: (s: TripSnapshot) => void }) {
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [invite, setInvite] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      onDone(await api.login(name.trim(), pin, invite.trim()));
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="login" onSubmit={submit}>
      <h1>旅行本</h1>
      <p className="muted">第一次使用：填昵称、自己设一个 PIN，再填邀请码。以后只填昵称和 PIN。</p>
      <label>昵称<input value={name} onChange={(e) => setName(e.target.value)} maxLength={20} autoComplete="username" required /></label>
      <label>PIN（4–8 位数字）
        <input value={pin} onChange={(e) => setPin(e.target.value)} inputMode="numeric" pattern="\d{4,8}"
          type="password" autoComplete="current-password" required />
      </label>
      <label>邀请码（仅首次）<input value={invite} onChange={(e) => setInvite(e.target.value)} inputMode="numeric" /></label>
      {error && <p className="error">{error}</p>}
      <button className="btn primary" disabled={busy}>{busy ? '请稍候…' : '进入旅行本'}</button>
    </form>
  );
}
