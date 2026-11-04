// 极简持久化：一个 JSON 文件存元数据，照片按 id 存成 JPEG 文件。
// 单进程、同步写入，每次修改后先写临时文件再改名，避免写一半断电损坏。
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { Member, Note, Photo } from '../shared/types.ts';

export interface StoredMember extends Member {
  pinSalt: string;
  pinHash: string;
}

export interface Db {
  trip: { id: string; name: string; inviteCode: string };
  members: StoredMember[];
  sessions: Record<string, string>; // token -> memberId
  photos: Photo[];
  notes: Note[];
  version: number;
}

export const DATA_DIR = path.resolve(import.meta.dirname, '..', 'data');
export const PHOTO_DIR = path.join(DATA_DIR, 'photos');
const DB_FILE = path.join(DATA_DIR, 'db.json');

export function randomId(bytes = 16): string {
  return crypto.randomBytes(bytes).toString('hex');
}

function createDb(): Db {
  return {
    trip: {
      id: randomId(8),
      name: process.env.TRIP_NAME ?? '我们的旅行本',
      inviteCode: process.env.INVITE_CODE ?? crypto.randomInt(100000, 1000000).toString(),
    },
    members: [],
    sessions: {},
    photos: [],
    notes: [],
    version: 1,
  };
}

function load(): Db {
  fs.mkdirSync(PHOTO_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    const fresh = createDb();
    writeFile(fresh);
    return fresh;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) as Db;
}

function writeFile(data: Db): void {
  const tmp = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

export const db: Db = load();

type Listener = (version: number) => void;
const listeners = new Set<Listener>();

export function onChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** 所有写操作都经过这里：改内存、版本号 +1、落盘、通知在线的客户端。 */
export function commit(mutate: (d: Db) => void): void {
  mutate(db);
  db.version += 1;
  writeFile(db);
  for (const fn of listeners) fn(db.version);
}

/** 只改登录会话，不算共享内容变化，不通知客户端。 */
export function saveSessions(): void {
  writeFile(db);
}
