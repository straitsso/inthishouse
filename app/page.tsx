"use client";

import { useEffect, useRef, useState } from "react";
import { SIGNS } from "./signs";

const W = 1200;
const H = 800;
const MAX_W = 1060;
const GAP = 6;
const LINE_HEIGHT = 1.05;

type Line = {
  font: string;
  weight: number;
  size: number;
  spacing: number;
  color: string;
  upper: boolean;
};

const LINES: Line[] = [
  { font: "Archivo Black", weight: 400, size: 50, spacing: 14, color: "#F2F2F2", upper: true },
  { font: "Archivo Black", weight: 400, size: 112, spacing: 6, color: "#F2F2F2", upper: true },
  { font: "Archivo Black", weight: 400, size: 60, spacing: 9, color: "#E9E27C", upper: true },
  { font: "Lato", weight: 300, size: 90, spacing: 16, color: "#9CC9EC", upper: true },
  { font: "Archivo Black", weight: 400, size: 64, spacing: 12, color: "#E2546B", upper: true },
  { font: "Roboto Condensed", weight: 400, size: 44, spacing: 0, color: "#F0A35E", upper: false },
  { font: "Lato", weight: 300, size: 76, spacing: 2, color: "#8FD18A", upper: true },
  { font: "Archivo", weight: 800, size: 62, spacing: 0, color: "#CFE6F5", upper: true },
  { font: "Open Sans", weight: 400, size: 31, spacing: 0, color: "#F2F2F2", upper: false },
];

const fontString = (l: Line, size: number) => `${l.weight} ${size}px "${l.font}"`;

function draw(canvas: HTMLCanvasElement, texts: string[]) {
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#262424";
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Lay out non-blank lines, shrinking any that overflow MAX_W.
  const rows = LINES.flatMap((l, i) => {
    const raw = texts[i].trim();
    if (!raw) return [];
    const text = l.upper ? raw.toUpperCase() : raw;
    let size = l.size;
    let spacing = l.spacing;
    for (let n = 0; n < 5; n++) {
      ctx.font = fontString(l, size);
      ctx.letterSpacing = `${spacing}px`;
      // measureText includes spacing after the last glyph; drop it.
      const width = ctx.measureText(text).width - spacing;
      if (width <= MAX_W) break;
      const scale = MAX_W / width;
      size *= scale;
      spacing *= scale;
    }
    return [{ l, text, size, spacing }];
  });

  const total =
    rows.reduce((sum, r) => sum + r.size * LINE_HEIGHT, 0) + GAP * Math.max(rows.length - 1, 0);
  let y = (H - total) / 2;

  for (const r of rows) {
    const h = r.size * LINE_HEIGHT;
    ctx.font = fontString(r.l, r.size);
    ctx.letterSpacing = `${r.spacing}px`;
    ctx.fillStyle = r.l.color;
    // Offset by half the trailing spacing so the visible glyphs are centered.
    ctx.fillText(r.text, W / 2 + r.spacing / 2, y + h / 2);
    y += h + GAP;
  }
}

export default function Page() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Lines 3-9 start empty so server and client render the same; a random sign fills them on mount.
  const [texts, setTexts] = useState(() => ["In this house", "We believe", ...Array(7).fill("")]);
  const lastSign = useRef(-1);
  const [fontsReady, setFontsReady] = useState(0);

  useEffect(() => {
    Promise.all(LINES.map((l) => document.fonts.load(fontString(l, l.size))))
      .then(() => document.fonts.ready)
      .then(() => setFontsReady((n) => n + 1));
  }, []);

  useEffect(() => {
    if (canvasRef.current) draw(canvasRef.current, texts);
  }, [texts, fontsReady]);

  const download = () => {
    canvasRef.current?.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "in-this-house.png";
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  const random = () => {
    let i = Math.floor(Math.random() * SIGNS.length);
    if (SIGNS.length > 1) while (i === lastSign.current) i = Math.floor(Math.random() * SIGNS.length);
    lastSign.current = i;
    setTexts((t) => [t[0], t[1], ...SIGNS[i]]);
  };

  useEffect(random, []);

  const clear = () => setTexts((t) => t.map((v, i) => (i < 2 ? v : "")));

  return (
    <main className="mx-auto grid max-w-7xl gap-8 p-6 md:grid-cols-2 md:items-center">
      <div className="flex flex-col gap-3">
        {LINES.map((l, i) => (
          <input
            key={i}
            value={texts[i]}
            onChange={(e) => setTexts((t) => t.map((v, j) => (j === i ? e.target.value : v)))}
            className="w-full border border-[#3a3737] bg-[#262424] px-3 py-2 outline-none"
            style={{ borderLeft: `5px solid ${l.color}` }}
            aria-label={`Line ${i + 1}`}
          />
        ))}
        <div className="mt-2 flex gap-3">
          <button
            onClick={download}
            className="bg-[#E9E27C] px-5 py-3 uppercase text-[#262424]"
            style={{ fontFamily: '"Archivo Black"' }}
          >
            Download PNG
          </button>
          <button onClick={clear} className="border border-[#3a3737] px-5 py-3">
            Clear
          </button>
          <button onClick={random} className="border border-[#3a3737] px-5 py-3">
            Random
          </button>
        </div>
      </div>
      <canvas ref={canvasRef} width={W} height={H} className="order-first h-auto w-full md:order-last" />
    </main>
  );
}
