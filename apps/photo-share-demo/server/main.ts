// 入口：API + 实时通知（SSE）+ 托管前端构建产物。只用 Node 标准库。
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { db, onChange } from './store.ts';
import { HttpError, sendJson, readBody, readJson } from './http.ts';
import { joinOrLogin, logout, requireMember, SESSION_COOKIE } from './auth.ts';
import * as photos from './photos.ts';

const PORT = Number(process.env.PORT ?? 8787);
const DIST = path.resolve(import.meta.dirname, '..', 'dist');
const MAX_PHOTO_BYTES = 15 * 1024 * 1024;

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};

function serveStatic(urlPath: string, res: http.ServerResponse): void {
  const rel = path.normalize(decodeURIComponent(urlPath)).replace(/^([/\\])+/, '');
  let file = path.join(DIST, rel);
  if (!file.startsWith(DIST) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    file = path.join(DIST, 'index.html'); // 单页应用：未知路径都回到首页
  }
  if (!fs.existsSync(file)) {
    res.writeHead(503, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('前端还没构建，请先运行 npm run build');
    return;
  }
  const ext = path.extname(file);
  const hashed = file.includes(`${path.sep}assets${path.sep}`);
  res.writeHead(200, {
    'content-type': MIME[ext] ?? 'application/octet-stream',
    'cache-control': hashed ? 'public, max-age=31536000, immutable' : 'no-cache',
  });
  fs.createReadStream(file).pipe(res);
}

function setSessionCookie(req: http.IncomingMessage, res: http.ServerResponse, token: string, maxAge: number): void {
  const secure = req.headers['x-forwarded-proto'] === 'https' || process.env.COOKIE_SECURE === '1';
  res.setHeader('set-cookie',
    `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? '; Secure' : ''}`);
}

/** 实时通知：有变化时只推送新版本号，客户端收到后重新拉取快照。 */
function openEvents(req: http.IncomingMessage, res: http.ServerResponse): void {
  requireMember(req);
  res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive' });
  res.write(`data: ${db.version}\n\n`);
  const off = onChange((v) => res.write(`data: ${v}\n\n`));
  const ping = setInterval(() => res.write(': ping\n\n'), 25_000);
  req.on('close', () => { off(); clearInterval(ping); });
}

type Body = Record<string, unknown>;

async function handleApi(req: http.IncomingMessage, res: http.ServerResponse, url: URL): Promise<void> {
  const method = req.method ?? 'GET';
  const parts = url.pathname.split('/').filter(Boolean).slice(1); // 去掉 "api"
  const key = `${method} /${parts.map((p, i) => (i === 1 && parts[0] === 'photos' ? ':id' : p)).join('/')}`;
  const pid = parts[1] ?? '';

  switch (key) {
    case 'POST /login': {
      const { token, member } = joinOrLogin(await readJson<Body>(req));
      setSessionCookie(req, res, token, 60 * 60 * 24 * 180);
      return sendJson(res, 200, photos.snapshot(member));
    }
    case 'POST /logout':
      logout(req);
      setSessionCookie(req, res, '', 0);
      return sendJson(res, 200, { ok: true });
    case 'GET /snapshot':
      return sendJson(res, 200, photos.snapshot(requireMember(req)));
    case 'GET /events':
      return openEvents(req, res);
    case 'PUT /photos/:id': {
      const me = requireMember(req);
      const body = await readBody(req, MAX_PHOTO_BYTES);
      const w = Number(url.searchParams.get('w')), h = Number(url.searchParams.get('h'));
      return sendJson(res, 200, photos.savePhoto(me, pid, body, w, h));
    }
    case 'GET /photos/:id': {
      requireMember(req);
      const file = photos.photoFilePath(pid);
      if (!fs.existsSync(file)) throw new HttpError(404, 'not_found', '照片不存在');
      res.writeHead(200, { 'content-type': 'image/jpeg', 'cache-control': 'private, max-age=31536000, immutable' });
      fs.createReadStream(file).pipe(res);
      return;
    }
    case 'DELETE /photos/:id':
      photos.deletePhoto(requireMember(req), pid);
      return sendJson(res, 200, { ok: true });
    case 'POST /photos/:id/notes': {
      const b = await readJson<Body>(req);
      return sendJson(res, 200, photos.addNote(requireMember(req), pid, String(b.id ?? ''), b.text));
    }
    case 'POST /photos/:id/location': {
      const b = await readJson<Body>(req);
      return sendJson(res, 200, photos.setLocation(requireMember(req), pid, b.location, b.baseVersion));
    }
    case 'POST /photos/:id/tags': {
      const b = await readJson<Body>(req);
      return sendJson(res, 200, photos.addTag(requireMember(req), pid, b.text));
    }
    case 'POST /photos/:id/tags/remove': {
      requireMember(req);
      const b = await readJson<Body>(req);
      return sendJson(res, 200, photos.removeTag(pid, b.text));
    }
  }
  if (method === 'DELETE' && parts[0] === 'notes' && parts[1]) {
    photos.deleteNote(requireMember(req), parts[1]);
    return sendJson(res, 200, { ok: true });
  }
  throw new HttpError(404, 'not_found', '接口不存在');
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  try {
    if (url.pathname.startsWith('/api/')) await handleApi(req, res, url);
    else serveStatic(url.pathname, res);
  } catch (err) {
    if (err instanceof HttpError) {
      if (!res.headersSent) sendJson(res, err.status, { error: err.message, code: err.code, current: err.current });
    } else {
      console.error(err);
      if (!res.headersSent) sendJson(res, 500, { error: '服务器出错了', code: 'bad_request' });
    }
  }
});

server.listen(PORT, () => {
  const lan = Object.values(os.networkInterfaces()).flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal).map((i) => `http://${i!.address}:${PORT}`);
  console.log(`旅行本「${db.trip.name}」已启动`);
  console.log(`本机: http://localhost:${PORT}`);
  for (const u of lan) console.log(`局域网: ${u}`);
  console.log(`邀请码: ${db.trip.inviteCode}（成员 ${db.members.length}/2）`);
});
