"use client";

import { useEffect, useRef, useState } from "react";
import { SIGNS } from "./signs";
import { PRODUCTS, type ProductKey } from "./products";

const W = 1200;
const H = 800;
const MAX_W = 1060;
const GAP = 6;
const LINE_HEIGHT = 1.05;
const BG = "#262424";
const LOGO = [["I", "#E9E27C"], ["T", "#9CC9EC"], ["H", "#E2546B"], ["W", "#F0A35E"], ["B", "#8FD18A"]];

type View = "sign" | ProductKey;
const VIEWS: { key: View; label: string }[] = [
  { key: "sign", label: "Sign" },
  ...(Object.keys(PRODUCTS) as ProductKey[]).map((key) => ({ key, label: PRODUCTS[key].label })),
];

// Preview canvas size for each view; products keep their print area's aspect ratio.
function canvasSize(view: View) {
  if (view === "sign") return [W, H];
  const p = PRODUCTS[view];
  const w = view === "sticker" ? 1800 : W;
  return [w, Math.round((w * p.heightIn) / p.widthIn)];
}

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

function draw(canvas: HTMLCanvasElement, texts: string[], view: View) {
  const [cw, ch] = canvasSize(view);
  if (canvas.width !== cw || canvas.height !== ch) {
    canvas.width = cw;
    canvas.height = ch;
  }
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (view === "sticker") return drawSticker(ctx, texts, canvas.width, canvas.height);

  // Sign and yard sign: the 1200x800 sign, scaled to the canvas width and centered vertically.
  const k = canvas.width / W;
  ctx.setTransform(k, 0, 0, k, 0, (canvas.height - H * k) / 2);
  drawSign(ctx, texts);
}

// Shrinks size and spacing together until `measure` reports a width that fits.
function fit(ctx: CanvasRenderingContext2D, l: Line, text: string, size: number, spacing: number, maxW: number) {
  for (let n = 0; n < 5; n++) {
    ctx.font = fontString(l, size);
    ctx.letterSpacing = `${spacing}px`;
    // measureText includes spacing after the last glyph; drop it.
    const width = ctx.measureText(text).width - spacing;
    if (width <= maxW) return { size, spacing, width };
    const scale = maxW / width;
    size *= scale;
    spacing *= scale;
  }
  return { size, spacing, width: maxW };
}

const lineText = (l: Line, raw: string) => (l.upper ? raw.trim().toUpperCase() : raw.trim());

function drawSign(ctx: CanvasRenderingContext2D, texts: string[]) {
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Lay out non-blank lines, shrinking any that overflow MAX_W.
  const rows = LINES.flatMap((l, i) => {
    const text = lineText(l, texts[i]);
    if (!text) return [];
    return [{ l, text, ...fit(ctx, l, text, l.size, l.spacing, MAX_W) }];
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

// Bumper sticker: lines 1-2, 3-5 and 6-9 each run together on one row, and each row
// is scaled to the sticker's width (then all rows shrink together if they're too tall).
const STICKER_ROWS = [[0, 1], [2, 3, 4], [5, 6, 7, 8]];

function drawSticker(ctx: CanvasRenderingContext2D, texts: string[], w: number, h: number) {
  const pad = h * 0.08;
  const maxW = w - pad * 2;
  const maxH = h - pad * 2;

  // Natural layout of each row at the base sizes.
  const rows = STICKER_ROWS.flatMap((idx) => {
    const segs = idx.flatMap((i) => {
      const l = LINES[i];
      const text = lineText(l, texts[i]);
      if (!text) return [];
      return [{ l, text, ...fit(ctx, l, text, l.size, l.spacing, Infinity) }];
    });
    if (!segs.length) return [];
    const maxSize = Math.max(...segs.map((s) => s.size));
    const gap = maxSize * 0.35;
    const width = segs.reduce((sum, s) => sum + s.width, 0) + gap * (segs.length - 1);
    return [{ segs, gap, width, maxSize, k: maxW / width }];
  });
  if (!rows.length) return;

  const rowGap = GAP * 2;
  const height = (k: number) =>
    rows.reduce((sum, r) => sum + r.maxSize * r.k * k * LINE_HEIGHT, 0) + rowGap * (rows.length - 1);
  const shrink = Math.min(1, (maxH - rowGap * (rows.length - 1)) / (height(1) - rowGap * (rows.length - 1)));

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  let y = (h - height(shrink)) / 2;

  for (const r of rows) {
    const k = r.k * shrink;
    const rowH = r.maxSize * k * LINE_HEIGHT;
    // Shared baseline: place it so the tallest font's em box is centered in the row.
    const baseline = y + rowH / 2 + r.maxSize * k * 0.36;
    let x = (w - r.width * k) / 2;
    for (const s of r.segs) {
      ctx.font = fontString(s.l, s.size * k);
      ctx.letterSpacing = `${s.spacing * k}px`;
      ctx.fillStyle = s.l.color;
      ctx.fillText(s.text, x, baseline);
      x += s.width * k + r.gap * k;
    }
    y += rowH + rowGap;
  }
}

export default function Page() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Lines 3-9 start empty so server and client render the same; a random sign fills them on mount.
  const [texts, setTexts] = useState(() => ["In this house", "We believe", ...Array(7).fill("")]);
  const lastSign = useRef(-1);
  const [fontsReady, setFontsReady] = useState(0);
  const [view, setView] = useState<View>("sign");

  useEffect(() => {
    Promise.all(LINES.map((l) => document.fonts.load(fontString(l, l.size))))
      .then(() => document.fonts.ready)
      .then(() => setFontsReady((n) => n + 1));
  }, []);

  useEffect(() => {
    if (canvasRef.current) draw(canvasRef.current, texts, view);
  }, [texts, fontsReady, view]);

  const download = () => {
    canvasRef.current?.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = view === "sign" ? "in-this-house.png" : `in-this-house-${view}.png`;
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
    <main className="mx-auto grid max-w-7xl gap-8 p-6 md:grid-cols-2 md:items-start">
      <h1
        aria-label="In This House We Believe"
        className="order-first col-span-full text-4xl tracking-[0.12em]"
        style={{ fontFamily: '"Archivo Black"' }}
      >
        {LOGO.map(([letter, color]) => (
          <span key={letter} style={{ color }} aria-hidden>
            {letter}
          </span>
        ))}
      </h1>
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
      <div className="order-first flex flex-col gap-3 md:order-last">
        <div className="flex gap-2">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              className={`border px-4 py-2 text-sm ${
                view === v.key ? "border-[#F2F2F2]" : "border-[#3a3737] text-[#F2F2F2]/60"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
        <canvas ref={canvasRef} width={W} height={H} className="h-auto w-full" />
      </div>
    </main>
  );
}
