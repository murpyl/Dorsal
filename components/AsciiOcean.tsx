"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** Five ASCII underwater scenes rendered into a fixed <pre> behind the page. Pick one with the switcher (persisted). */
type Scene = { id: string; name: string; color: string; frame: (t: number, cols: number, rows: number) => string };

const STORAGE_KEY = "classpulse:ascii-ocean";
const CELL_W = 7.2;
const CELL_H = 15;
const FPS = 8;

function grid(cols: number, rows: number) {
  return Array.from({ length: rows }, () => new Array<string>(cols).fill(" "));
}
function put(g: string[][], x: number, y: number, s: string) {
  const row = g[Math.round(y)];
  if (!row) return;
  const x0 = Math.round(x);
  for (let i = 0; i < s.length; i++) if (x0 + i >= 0 && x0 + i < row.length && s[i] !== " ") row[x0 + i] = s[i];
}
function join(g: string[][]) {
  return g.map((r) => r.join("")).join("\n");
}
function noise(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export const SCENES: Scene[] = [
  {
    id: "swell",
    name: "Swell",
    color: "oklch(0.58 0.12 245 / 0.42)",
    frame(t, cols, rows) {
      const g = grid(cols, rows);
      const glyphs = ["~", "≈", "-", "_", "·"];
      for (let b = 0; b < 5; b++) {
        const base = rows * (0.55 + b * 0.1);
        for (let x = 0; x < cols; x++) {
          const y = base + Math.sin(x / (9 + b * 2) + t * (0.9 - b * 0.12) + b) * 1.6 + Math.sin(x / 23 - t * 0.4) * 0.8;
          put(g, x, y, glyphs[b % glyphs.length]);
        }
      }
      return join(g);
    },
  },
  {
    id: "bubbles",
    name: "Bubbles",
    color: "oklch(0.66 0.1 215 / 0.5)",
    frame(t, cols, rows) {
      const g = grid(cols, rows);
      const n = Math.max(12, Math.floor(cols / 4));
      for (let i = 0; i < n; i++) {
        const speed = 2.2 + noise(i) * 3;
        const x = noise(i + 100) * cols + Math.sin(t * 1.3 + i) * 1.5;
        const y = rows - ((t * speed + noise(i + 200) * rows * 3) % (rows + 2));
        const size = noise(i + 300);
        put(g, x, y, size > 0.8 ? "O" : size > 0.45 ? "o" : size > 0.2 ? "°" : ".");
      }
      for (let x = 0; x < cols; x += 1) put(g, x, rows - 1 - Math.round((Math.sin(x / 5 + t) + 1) * 0.5), "~");
      return join(g);
    },
  },
  {
    id: "kelp",
    name: "Kelp forest",
    color: "oklch(0.56 0.09 185 / 0.45)",
    frame(t, cols, rows) {
      const g = grid(cols, rows);
      const strands = Math.max(6, Math.floor(cols / 9));
      for (let s = 0; s < strands; s++) {
        const x0 = noise(s + 7) * cols;
        const height = rows * (0.35 + noise(s + 17) * 0.45);
        for (let k = 0; k < height; k++) {
          const y = rows - 1 - k;
          const sway = Math.sin(t * 0.8 + s + k / 4) * (k / height) * 3;
          const ch = k % 5 === 0 ? ")" : k % 5 === 2 ? "(" : "|";
          put(g, x0 + sway, y, ch);
          if (k % 7 === 3) put(g, x0 + sway + (k % 2 ? 1.5 : -1.5), y, "°");
        }
      }
      for (let x = 0; x < cols; x++) if (noise(x) > 0.86) put(g, x, rows - 1, ".");
      return join(g);
    },
  },
  {
    id: "shoal",
    name: "Shoal",
    color: "oklch(0.5 0.1 232 / 0.4)",
    frame(t, cols, rows) {
      const g = grid(cols, rows);
      const fish = Math.max(10, Math.floor((cols * rows) / 260));
      for (let i = 0; i < fish; i++) {
        const dir = noise(i + 50) > 0.5 ? 1 : -1;
        const speed = (3 + noise(i) * 5) * dir;
        const y = noise(i + 60) * rows + Math.sin(t * 0.7 + i) * 1.2;
        const x = (((t * speed + noise(i + 70) * cols * 2) % (cols + 6)) + cols + 6) % (cols + 6) - 3;
        const big = noise(i + 80) > 0.75;
        put(g, x, y, dir > 0 ? (big ? "><(((°>" : "><>") : big ? "<°)))><" : "<><");
      }
      for (let x = 0; x < cols; x++) put(g, x, Math.round(Math.sin(x / 7 + t * 0.6) + 1), "~");
      return join(g);
    },
  },
  {
    id: "abyss",
    name: "Abyss",
    color: "oklch(0.42 0.09 268 / 0.5)",
    frame(t, cols, rows) {
      const g = grid(cols, rows);
      for (let i = 0; i < cols * 1.2; i++) {
        const x = noise(i + 900) * cols;
        const y = noise(i + 901) * rows;
        if ((Math.sin(t * 1.5 + i) + 1) / 2 > 0.72) put(g, x, y, noise(i + 902) > 0.7 ? "*" : ".");
      }
      const jellies = Math.max(3, Math.floor(cols / 28));
      for (let j = 0; j < jellies; j++) {
        const x = noise(j + 400) * cols + Math.sin(t * 0.3 + j) * 4;
        const y = ((noise(j + 401) * rows + rows - t * (0.6 + noise(j + 402) * 0.6)) % rows + rows) % rows;
        const pulse = Math.sin(t * 2 + j) > 0.3;
        put(g, x - 2, y, pulse ? " .-. " : ".---.");
        put(g, x - 3, y + 1, pulse ? "( o o )" : "(  o  )");
        for (let k = 2; k < 7; k++) {
          const sway = Math.sin(t * 1.6 + k + j) * 1.2;
          put(g, x - 2 + sway, y + k, k % 2 ? "' ' '" : " ' ' ");
        }
      }
      return join(g);
    },
  },
];

export function AsciiOcean() {
  const [scene, setScene] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [size, setSize] = useState({ cols: 0, rows: 0 });

  useEffect(() => {
    const measure = () =>
      setSize({ cols: Math.ceil(window.innerWidth / CELL_W) + 1, rows: Math.ceil(window.innerHeight / CELL_H) + 1 });
    const init = requestAnimationFrame(() => {
      setScene(localStorage.getItem(STORAGE_KEY) ?? SCENES[0].id);
      measure();
    });
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(init);
      window.removeEventListener("resize", measure);
    };
  }, []);

  useEffect(() => {
    const current = SCENES.find((s) => s.id === scene);
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    let last = 0;
    let raf = 0;
    const tick = (now: number) => {
      if (last === 0 || now - last >= 1000 / FPS) {
        last = now;
        setText(current && size.cols ? current.frame((now - start) / 1000, size.cols, size.rows) : "");
      }
      if (current && !still) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [scene, size]);

  const pick = (id: string) => {
    setScene(id);
    localStorage.setItem(STORAGE_KEY, id);
  };
  const color = SCENES.find((s) => s.id === scene)?.color;
  const options = [...SCENES, { id: "off", name: "Off" }];
  const checkedIndex = Math.max(0, options.findIndex((s) => s.id === scene));

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    const next = step ? (checkedIndex + step + options.length) % options.length : e.key === "Home" ? 0 : e.key === "End" ? options.length - 1 : null;
    if (next === null) return;
    e.preventDefault();
    pick(options[next].id);
    (e.currentTarget.children[next] as HTMLElement | undefined)?.focus();
  };

  return (
    <>
      <pre
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 m-0 overflow-hidden font-mono text-[12px] leading-[15px] select-none"
        style={{ color }}
      >
        {text}
      </pre>
      <div
        role="radiogroup"
        aria-label="Background animation"
        onKeyDown={onKeyDown}
        className="fixed right-2 bottom-2 z-20 flex max-w-[calc(100vw-1rem)] flex-wrap justify-end gap-0.5 rounded-full bg-card/80 p-1 text-[11px] ring-1 ring-border/70 backdrop-blur sm:right-3 sm:bottom-3 sm:gap-1 sm:text-xs"
      >
        {options.map((s, i) => (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={scene === s.id}
            tabIndex={i === checkedIndex ? 0 : -1}
            onClick={() => pick(s.id)}
            className={cn(
              "pressable rounded-full px-2 py-1 font-medium sm:px-2.5 text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 outline-none",
              scene === s.id && "bg-primary text-primary-foreground hover:text-primary-foreground",
            )}
          >
            {s.name}
          </button>
        ))}
      </div>
    </>
  );
}
