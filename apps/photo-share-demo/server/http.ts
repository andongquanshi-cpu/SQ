// 请求 / 响应的小工具函数，避免引入 Web 框架。
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ApiError } from '../shared/types.ts';

export class HttpError extends Error {
  status: number;
  code: ApiError['code'];
  current?: unknown;
  constructor(status: number, code: ApiError['code'], message: string, current?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.current = current;
  }
}

export function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}

export async function readBody(req: IncomingMessage, limit: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > limit) throw new HttpError(413, 'too_large', '文件太大');
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks);
}

export async function readJson<T>(req: IncomingMessage): Promise<T> {
  const buf = await readBody(req, 64 * 1024);
  try {
    return JSON.parse(buf.toString('utf8')) as T;
  } catch {
    throw new HttpError(400, 'bad_request', '请求格式不对');
  }
}

export function getCookie(req: IncomingMessage, name: string): string | undefined {
  const header = req.headers.cookie ?? '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return undefined;
}
