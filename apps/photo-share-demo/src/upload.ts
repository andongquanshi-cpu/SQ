import { ApiFailure } from './api.ts';
import type { Photo } from '../shared/types.ts';

/** 用 XHR 上传，是为了拿到上传进度；fetch 在 iPhone Safari 上没有上传进度。 */
export function uploadPhoto(
  id: string, blob: Blob, width: number, height: number, onProgress: (ratio: number) => void,
): Promise<Photo> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', `/api/photos/${id}?w=${width}&h=${height}`);
    xhr.setRequestHeader('content-type', 'image/jpeg');
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(e.loaded / e.total); };
    xhr.onload = () => {
      let data: { error?: string; code?: ApiFailure['code'] } = {};
      try { data = JSON.parse(xhr.responseText); } catch { /* 非 JSON 响应 */ }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data as unknown as Photo);
      else reject(new ApiFailure(xhr.status, data.code ?? 'bad_request', data.error ?? `上传失败（${xhr.status}）`));
    };
    xhr.onerror = () => reject(new ApiFailure(0, 'network', '网络中断，上传没有完成'));
    xhr.ontimeout = () => reject(new ApiFailure(0, 'network', '上传超时'));
    xhr.timeout = 120_000;
    xhr.send(blob);
  });
}
