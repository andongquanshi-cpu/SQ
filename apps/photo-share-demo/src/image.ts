// 在上传端把照片统一转成 JPEG：
// - iPhone 的 HEIC 由 Safari 自己解码，转成 JPEG 后小米也能显示；
// - 现代浏览器绘制 <img> 时会按 EXIF 方向摆正，画到 canvas 再导出，方向信息就“烧”进像素里；
// - 长边压到 2560px，避免原图过大导致上传太慢。
const MAX_SIDE = 2560;
const QUALITY = 0.85;

export interface PreparedImage {
  blob: Blob;
  width: number;
  height: number;
  previewUrl: string;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('这台手机的浏览器打不开这个图片格式'));
    };
    img.src = url;
  });
}

export async function prepareImage(file: File): Promise<PreparedImage> {
  const img = await loadImage(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.round(img.naturalWidth * scale);
  const height = Math.round(img.naturalHeight * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法处理图片');
  ctx.drawImage(img, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', QUALITY));
  if (!blob) throw new Error('图片转换失败');
  return { blob, width, height, previewUrl: URL.createObjectURL(blob) };
}
