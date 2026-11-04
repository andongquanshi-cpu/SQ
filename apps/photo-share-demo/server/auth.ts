// 账号：昵称 + PIN。第一次用邀请码加入旅行本，之后用昵称 + PIN 登录。
import crypto from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import { db, commit, saveSessions, randomId, type StoredMember } from './store.ts';
import { HttpError, getCookie } from './http.ts';

export const SESSION_COOKIE = 'sid';
const MAX_MEMBERS = 2;

function hashPin(pin: string, salt: string): string {
  return crypto.scryptSync(pin, salt, 32).toString('hex');
}

function pinMatches(member: StoredMember, pin: string): boolean {
  const a = Buffer.from(hashPin(pin, member.pinSalt), 'hex');
  const b = Buffer.from(member.pinHash, 'hex');
  return crypto.timingSafeEqual(a, b);
}

// 简单防暴力猜 PIN：同一昵称连续错 5 次锁 5 分钟（只存在内存里）。
const failures = new Map<string, { count: number; until: number }>();

export function joinOrLogin(input: { name?: unknown; pin?: unknown; inviteCode?: unknown }): { token: string; member: StoredMember } {
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const pin = typeof input.pin === 'string' ? input.pin : '';
  if (!name || name.length > 20) throw new HttpError(400, 'bad_request', '昵称 1–20 个字');
  if (!/^\d{4,8}$/.test(pin)) throw new HttpError(400, 'bad_request', 'PIN 是 4–8 位数字');

  const lock = failures.get(name);
  if (lock && lock.until > Date.now()) throw new HttpError(429, 'forbidden', '错误次数太多，5 分钟后再试');

  const existing = db.members.find((m) => m.name === name);
  if (existing) {
    if (!pinMatches(existing, pin)) {
      const count = (lock?.count ?? 0) + 1;
      failures.set(name, { count, until: count >= 5 ? Date.now() + 5 * 60_000 : 0 });
      throw new HttpError(401, 'unauthorized', '昵称或 PIN 不对');
    }
    failures.delete(name);
    return { token: createSession(existing.id), member: existing };
  }

  if (input.inviteCode !== db.trip.inviteCode) throw new HttpError(403, 'forbidden', '邀请码不对');
  if (db.members.length >= MAX_MEMBERS) throw new HttpError(403, 'trip_full', '这本旅行本已经有两位成员');

  const salt = randomId(16);
  const member: StoredMember = { id: randomId(8), name, joinedAt: new Date().toISOString(), pinSalt: salt, pinHash: hashPin(pin, salt) };
  commit((d) => d.members.push(member));
  return { token: createSession(member.id), member };
}

function createSession(memberId: string): string {
  const token = randomId(32);
  db.sessions[token] = memberId;
  saveSessions();
  return token;
}

export function logout(req: IncomingMessage): void {
  const token = getCookie(req, SESSION_COOKIE);
  if (token && db.sessions[token]) {
    delete db.sessions[token];
    saveSessions();
  }
}

/** 每个业务接口都先调用它：没登录或已不是成员就拒绝。 */
export function requireMember(req: IncomingMessage): StoredMember {
  const token = getCookie(req, SESSION_COOKIE);
  const memberId = token ? db.sessions[token] : undefined;
  const member = memberId ? db.members.find((m) => m.id === memberId) : undefined;
  if (!member) throw new HttpError(401, 'unauthorized', '请先登录');
  return member;
}
