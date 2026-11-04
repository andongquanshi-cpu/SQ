// 照片、备注、地点、标签的业务规则。
// ID 由客户端生成：同一次提交重试时 ID 不变，服务端据此去重，不会多出一张照片或一条备注。
import fs from 'node:fs';
import path from 'node:path';
import { db, commit, PHOTO_DIR, type StoredMember } from './store.ts';
import { HttpError } from './http.ts';
import type { Member, Note, Photo, TripSnapshot } from '../shared/types.ts';

const ID_RE = /^[a-f0-9-]{16,40}$/;

export function checkId(id: string): string {
  if (!ID_RE.test(id)) throw new HttpError(400, 'bad_request', 'ID 格式不对');
  return id;
}

function now(): string {
  return new Date().toISOString();
}

function findPhoto(id: string): Photo {
  const photo = db.photos.find((p) => p.id === id && !p.deleted);
  if (!photo) throw new HttpError(404, 'not_found', '照片不存在或已删除');
  return photo;
}

function publicMember(m: StoredMember): Member {
  return { id: m.id, name: m.name, joinedAt: m.joinedAt };
}

export function snapshot(me: StoredMember): TripSnapshot {
  return {
    trip: { id: db.trip.id, name: db.trip.name },
    me: publicMember(me),
    members: db.members.map(publicMember),
    photos: db.photos.filter((p) => !p.deleted),
    notes: db.notes.filter((n) => !n.deleted),
    version: db.version,
  };
}

export function photoFilePath(id: string): string {
  return path.join(PHOTO_DIR, `${checkId(id)}.jpg`);
}

/** 客户端已经把照片（包括 iPhone 的 HEIC）转成方向正确的 JPEG，这里只校验并保存。 */
export function savePhoto(me: StoredMember, id: string, body: Buffer, width: number, height: number): Photo {
  checkId(id);
  const existing = db.photos.find((p) => p.id === id);
  if (existing) {
    if (existing.uploaderId !== me.id) throw new HttpError(409, 'conflict', 'ID 冲突');
    return existing; // 重复提交：直接返回已保存的结果
  }
  const isJpeg = body.length > 3 && body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff;
  if (!isJpeg) throw new HttpError(400, 'bad_request', '只接受 JPEG');
  if (!(width > 0 && height > 0 && width <= 10000 && height <= 10000)) throw new HttpError(400, 'bad_request', '尺寸不对');

  // 先写文件，再写数据库：数据库里出现的照片一定有文件。
  const file = photoFilePath(id);
  fs.writeFileSync(`${file}.tmp`, body);
  fs.renameSync(`${file}.tmp`, file);

  const photo: Photo = {
    id, uploaderId: me.id, createdAt: now(), width, height,
    location: '', locationVersion: 0, locationUpdatedBy: null, tags: [], deleted: false,
  };
  commit((d) => d.photos.push(photo));
  return photo;
}

/** 照片删除只允许上传者，采用可恢复标记（文件保留）。 */
export function deletePhoto(me: StoredMember, id: string): void {
  const photo = findPhoto(id);
  if (photo.uploaderId !== me.id) throw new HttpError(403, 'forbidden', '只有上传者能删除这张照片');
  commit(() => { photo.deleted = true; });
}

function cleanText(v: unknown, max: number, label: string): string {
  const s = typeof v === 'string' ? v.trim() : '';
  if (s.length > max) throw new HttpError(400, 'bad_request', `${label}最多 ${max} 个字`);
  return s;
}

/** 备注按作者分条追加；同一个 noteId 重复提交只算一次。 */
export function addNote(me: StoredMember, photoId: string, noteId: string, text: unknown): Note {
  findPhoto(photoId);
  checkId(noteId);
  const existing = db.notes.find((n) => n.id === noteId);
  if (existing) {
    if (existing.authorId !== me.id || existing.photoId !== photoId) throw new HttpError(409, 'conflict', 'ID 冲突');
    return existing;
  }
  const body = cleanText(text, 500, '备注');
  if (!body) throw new HttpError(400, 'bad_request', '备注不能为空');
  const t = now();
  const note: Note = { id: noteId, photoId, authorId: me.id, text: body, createdAt: t, updatedAt: t, deleted: false };
  commit((d) => d.notes.push(note));
  return note;
}

/** 只能删自己的备注。 */
export function deleteNote(me: StoredMember, noteId: string): void {
  const note = db.notes.find((n) => n.id === noteId && !n.deleted);
  if (!note) return; // 已经删过，重复请求视为成功
  if (note.authorId !== me.id) throw new HttpError(403, 'forbidden', '只能删除自己的备注');
  commit(() => { note.deleted = true; });
}

/** 地点是共享字段：带上客户端看到的版本号，版本过期就拒绝并返回当前值，不静默覆盖。 */
export function setLocation(me: StoredMember, photoId: string, location: unknown, baseVersion: unknown): Photo {
  const photo = findPhoto(photoId);
  const value = cleanText(location, 60, '地点');
  if (value === photo.location) return photo;
  if (baseVersion !== photo.locationVersion) {
    throw new HttpError(409, 'conflict', '对方刚改过地点', { location: photo.location, locationVersion: photo.locationVersion });
  }
  commit(() => {
    photo.location = value;
    photo.locationVersion += 1;
    photo.locationUpdatedBy = me.id;
  });
  return photo;
}

/** 标签：相同文字去重，添加和移除是独立操作，重复请求结果相同。 */
export function addTag(me: StoredMember, photoId: string, text: unknown): Photo {
  const photo = findPhoto(photoId);
  const value = cleanText(text, 20, '标签').replace(/^#/, '');
  if (!value) throw new HttpError(400, 'bad_request', '标签不能为空');
  if (photo.tags.some((t) => t.text === value)) return photo;
  if (photo.tags.length >= 20) throw new HttpError(400, 'bad_request', '一张照片最多 20 个标签');
  commit(() => { photo.tags.push({ text: value, addedBy: me.id, addedAt: now() }); });
  return photo;
}

export function removeTag(photoId: string, text: unknown): Photo {
  const photo = findPhoto(photoId);
  const value = typeof text === 'string' ? text : '';
  if (!photo.tags.some((t) => t.text === value)) return photo;
  commit(() => { photo.tags = photo.tags.filter((t) => t.text !== value); });
  return photo;
}
