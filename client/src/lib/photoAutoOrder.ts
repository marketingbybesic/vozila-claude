/**
 * Heuristic photo auto-ordering for listing uploads.
 *
 * No ML — just a few signals that correlate with "good first photo":
 *   * Aspect ratio close to 4:3 / 5:4 (front-three-quarter framing)
 *   * Brightness > 0.35 (avoid black night shots)
 *   * Saturation > 0.10 (avoid grey overcast / underexposed)
 *   * Filename hint (front, hero, primary, glavna, prednja)
 *
 * Operates on small thumbnails sampled into a 64×64 canvas so the
 * scoring is cheap (<10 ms per photo).
 */

interface PhotoScore {
  index: number;
  score: number;
  reasons: string[];
}

const NAME_HINTS = /(front|hero|primary|main|cover|glavna|prednja|naslovna|three-quarter)/i;

export async function autoOrderPhotos(files: File[]): Promise<File[]> {
  if (typeof window === 'undefined' || files.length <= 1) return files;
  const scores: PhotoScore[] = [];

  for (let i = 0; i < files.length; i++) {
    try {
      scores.push(await scorePhoto(files[i], i));
    } catch {
      scores.push({ index: i, score: 0, reasons: ['scoring failed'] });
    }
  }

  scores.sort((a, b) => b.score - a.score);
  return scores.map((s) => files[s.index]);
}

async function scorePhoto(file: File, index: number): Promise<PhotoScore> {
  const reasons: string[] = [];
  let score = 0;

  if (NAME_HINTS.test(file.name)) {
    score += 30;
    reasons.push('filename hint');
  }

  const img = await fileToImage(file);
  const { width, height } = img;
  const ratio = width / height;
  // Reward 4:3 (1.333) → 5:4 (1.250) range
  if (ratio >= 1.20 && ratio <= 1.45) {
    score += 20;
    reasons.push(`ratio ${ratio.toFixed(2)}`);
  } else if (ratio >= 1.10 && ratio <= 1.78) {
    score += 10;
  }

  // Sample brightness + saturation
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.drawImage(img, 0, 0, 64, 64);
    const data = ctx.getImageData(0, 0, 64, 64).data;
    let lum = 0;
    let sat = 0;
    let n = 0;
    for (let p = 0; p < data.length; p += 4) {
      const r = data[p] / 255;
      const g = data[p + 1] / 255;
      const b = data[p + 2] / 255;
      lum += 0.299 * r + 0.587 * g + 0.114 * b;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      sat += max === 0 ? 0 : (max - min) / max;
      n++;
    }
    const avgLum = lum / n;
    const avgSat = sat / n;

    if (avgLum > 0.55) {
      score += 15;
      reasons.push(`bright ${avgLum.toFixed(2)}`);
    } else if (avgLum > 0.35) {
      score += 8;
    } else {
      score -= 10;
    }

    if (avgSat > 0.18) {
      score += 10;
      reasons.push(`color-rich ${avgSat.toFixed(2)}`);
    } else if (avgSat > 0.08) {
      score += 4;
    }
  }

  // Tiny tiebreaker on file size (richer file usually means full-rez)
  score += Math.min(5, file.size / 1024 / 200);

  return { index, score, reasons };
}

function fileToImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve(img);
      // Revoke after load so the object URL doesn't leak.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('image load failed'));
    };
    img.src = url;
  });
}
