import { useEffect, useRef, useState } from 'react';

interface HistogramProps {
  imageUrl: string;
}

export default function Histogram({ imageUrl }: HistogramProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;

    img.onload = () => {
      // Draw to offscreen canvas, downscaled for performance
      const scale = Math.min(1, 200 / img.width);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);

      const offscreen = document.createElement('canvas');
      offscreen.width = w;
      offscreen.height = h;
      const offCtx = offscreen.getContext('2d');
      if (!offCtx) return;

      offCtx.drawImage(img, 0, 0, w, h);
      const { data } = offCtx.getImageData(0, 0, w, h);

      // Compute 256-bin luminosity histogram
      const bins = new Uint32Array(256);
      for (let i = 0; i < data.length; i += 4) {
        const L = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        bins[L]++;
      }

      // Render to visible canvas
      const canvas = canvasRef.current;
      if (!canvas) return;

      const cw = canvas.width;
      const ch = canvas.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const max = bins.reduce((a, b) => Math.max(a, b), 0);

      ctx.clearRect(0, 0, cw, ch);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';

      const barW = cw / 256;
      for (let i = 0; i < 256; i++) {
        const barH = (bins[i] / max) * ch;
        ctx.fillRect(i * barW, ch - barH, Math.ceil(barW), barH);
      }

      setReady(true);
    };
  }, [imageUrl]);

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={64}
      className="w-full"
      style={{
        height: 64,
        display: ready ? 'block' : 'none',
      }}
    />
  );
}
