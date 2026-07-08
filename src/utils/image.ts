export const fileToDataUrl = (blob: Blob | File): Promise<string> => new Promise((res, rej) => {
  const reader = new FileReader();
  reader.onload = () => res(String(reader.result));
  reader.onerror = rej;
  reader.readAsDataURL(blob as Blob);
});

export const validateImageUrl = (url: string, timeout = 6000): Promise<boolean> => new Promise((res) => {
  if (!url) return res(false);
  const img = new Image();
  let done = false;
  const onOK = () => { if (!done) { done = true; res(true); cleanup(); } };
  const onFail = () => { if (!done) { done = true; res(false); cleanup(); } };
  const cleanup = () => { img.onload = null; img.onerror = null; clearTimeout(t); };
  img.onload = onOK;
  img.onerror = onFail;
  const t = setTimeout(onFail, timeout);
  img.src = url;
});

export const optimizeImage = async (file: File, {
  maxWidth = 800,
  maxHeight = 800,
  maxBytes = 150000,
  mime = 'image/webp',
  quality = 0.8
}: { maxWidth?: number; maxHeight?: number; maxBytes?: number; mime?: string; quality?: number } = {}): Promise<Blob> => {
  try {
    if (!file.type || file.type === 'image/svg+xml') return file;
    const dataUrl = await fileToDataUrl(file);
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = dataUrl;
    });

    let { width, height } = img;
    const aspect = width / height;
    if (width > maxWidth) { width = maxWidth; height = Math.round(maxWidth / aspect); }
    if (height > maxHeight) { height = maxHeight; width = Math.round(maxHeight * aspect); }

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const tryBlob = (q: number, mimeType: string) => new Promise<Blob | null>((res) => {
      if (!canvas.toBlob) return res(null);
      canvas.toBlob((b) => res(b), mimeType, q);
    });

    let q = quality;
    let out: Blob | null = await tryBlob(q, mime);
    const minQuality = 0.5;
    while (out && out.size > maxBytes && q > minQuality) {
      q = Math.max(minQuality, q - 0.1);
      out = await tryBlob(q, mime) || out;
    }

    if (out && out.size > maxBytes && mime !== 'image/jpeg') {
      const jpeg = await tryBlob(Math.min(0.8, q), 'image/jpeg');
      if (jpeg && jpeg.size < out.size) out = jpeg;
    }

    if (!out) return file;
    return out.size < file.size ? out : file;
  } catch (err) {
    console.warn('optimizeImage failed, using original file', err);
    return file;
  }
};
