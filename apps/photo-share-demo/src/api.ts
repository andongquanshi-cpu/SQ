import type { ApiError, Note, Photo, TripSnapshot } from '../shared/types.ts';

export class ApiFailure extends Error {
  status: number;
  code: ApiError['code'] | 'network';
  current?: unknown;
  constructor(status: number, code: ApiFailure['code'], message: string, current?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.current = current;
  }
}

/** 局域网 http 下 iPhone 没有 crypto.randomUUID，用 getRandomValues 生成 32 位十六进制 ID。 */
export function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'same-origin',
    });
  } catch {
    throw new ApiFailure(0, 'network', '网络不通，稍后重试');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = data as Partial<ApiError>;
    throw new ApiFailure(res.status, e.code ?? 'bad_request', e.error ?? `请求失败（${res.status}）`, e.current);
  }
  return data as T;
}

export const api = {
  login: (name: string, pin: string, inviteCode: string) =>
    call<TripSnapshot>('POST', '/login', { name, pin, inviteCode: inviteCode || undefined }),
  logout: () => call<{ ok: true }>('POST', '/logout'),
  snapshot: () => call<TripSnapshot>('GET', '/snapshot'),
  deletePhoto: (id: string) => call<{ ok: true }>('DELETE', `/photos/${id}`),
  addNote: (photoId: string, id: string, text: string) => call<Note>('POST', `/photos/${photoId}/notes`, { id, text }),
  deleteNote: (id: string) => call<{ ok: true }>('DELETE', `/notes/${id}`),
  setLocation: (photoId: string, location: string, baseVersion: number) =>
    call<Photo>('POST', `/photos/${photoId}/location`, { location, baseVersion }),
  addTag: (photoId: string, text: string) => call<Photo>('POST', `/photos/${photoId}/tags`, { text }),
  removeTag: (photoId: string, text: string) => call<Photo>('POST', `/photos/${photoId}/tags/remove`, { text }),
};
