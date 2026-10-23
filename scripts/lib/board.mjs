// 섹션 보드: 타일 줄(row)들을 받아 SVG 한 장으로 그린다. 첫 화면 보드와 같은 언어(녹흑·뼈색 타일).
// 타일 높이는 내용으로 정하고, 한 줄의 타일은 가장 높은 타일에 맞춘다. 휴대폰(600px)에서는 타일을 한 줄에 하나씩 쌓는다.
// 글의 **굵게** 는 진한 글자로 바꾸고, 줄바꿈은 띄어쓰기 단위로만 한다(한글 어절이 갈리지 않게).
import { Canvas } from "./design.mjs";

// 녹흑 + 뼈색 보드 색. 라이트는 어두운 뼈색 판 위 밝은 타일, 다크는 첫 화면과 같은 녹흑
const BOARD = {
  light: { bg: "#DFDED6", tile: "#ECEBE5", tile2: "#E2E1D9" },
  dark: { bg: "#161C1A", tile: "#1F2725", tile2: "#28322F" },
};
const FIELD = { fill: "#161C1A", ink: "#E3E2DA", sub: "#A9AEA7", accent: "#9FC7B8" };
const ACCENT = { fill: "#9FC7B8", ink: "#161C1A", sub: "#2C3B36", accent: "#161C1A" };

const SIZES = {
  desktop: { W: 1200, m: 12, g: 10, pad: 28, title: 26, meta: 17, text: 19, bullet: 19, foot: 16, big: 64, unit: 28, label: 18, stat: 36, statLabel: 16, pill: 15 },
  mobile: { W: 600, m: 14, g: 12, pad: 30, title: 34, meta: 22, text: 25, bullet: 25, foot: 21, big: 84, unit: 34, label: 23, stat: 44, statLabel: 21, pill: 20 },
};

// 글자 폭 어림(Pretendard): 한글 0.88em, 숫자 0.6em, 그 밖 라틴 0.56em, 띄어쓰기 0.25em. 넘치지 않게 조금 넉넉히
export const measure = (s, size, weight = 500) =>
  [...s].reduce((w, ch) => w + (/[가-힣]/.test(ch) ? 0.88 : ch === " " ? 0.25 : /[0-9]/.test(ch) ? 0.6 : /[.,·:()'"]/.test(ch) ? 0.32 : 0.56), 0) * size * (weight >= 800 ? 1.04 : 1);

// "가 **나**를 다" → 단어 덩어리 [[가], [나(굵게), 를], [다]]. 띄어쓰기 없이 붙은 조각은 한 덩어리라 줄이 갈리지 않는다
const words = (text) => {
  const chunks = [];
  let glue = false;
  text.split("**").forEach((part, i) => {
    const bold = i % 2 === 1;
    const pieces = part.split(" ");
    pieces.forEach((piece, j) => {
      if (!piece) { glue = false; return; }
      if (j === 0 && glue && chunks.length) chunks.at(-1).push({ t: piece, b: bold });
      else chunks.push([{ t: piece, b: bold }]);
      glue = true;
    });
    if (part.endsWith(" ")) glue = false;
  });
  return chunks;
};
const chunkWidth = (chunk, size) => chunk.reduce((w, p) => w + measure(p.t, size, p.b ? 800 : 500), 0);
const chunkText = (chunk) => chunk.map((p) => p.t).join("");

export const plain = (text) => text.replaceAll("**", "");

function wrap(text, size, max) {
  const lines = [];
  let line = [], width = 0;
  for (const chunk of words(text)) {
    const ww = chunkWidth(chunk, size);
    const add = line.length ? measure(" ", size) + ww : ww;
    if (line.length && width + add > max) {
      lines.push(line);
      line = [chunk];
      width = ww;
    } else {
      line.push(chunk);
      width += add;
    }
  }
  if (line.length) lines.push(line);
  return lines;
}
const lineText = (line) => line.map(chunkText).join(" ");

// 한 줄을 굵기별 tspan 으로
function richLine(c, x, y, line, size, color, strong) {
  const parts = [];
  line.forEach((chunk, i) => {
    chunk.forEach((p, j) => {
      const text = (i && j === 0 ? " " : "") + p.t;
      const prev = parts.at(-1);
      if (prev && prev[1] === p.b) prev[0] += text;
      else parts.push([text, p.b]);
    });
  });
  return c.rich(x, y, parts.map(([s, bold]) => [s, { weight: bold ? 800 : 500, fill: bold ? strong : color }]), { size });
}

// 타일 내용 높이와 그리기를 한곳에서: draw=false 면 높이만 잰다
function tileContent(c, tile, box, S, ink, draw) {
  const parts = [];
  const { x, w } = box;
  let y = box.y + S.pad;
  const inner = w - S.pad * 2;
  const lh = (size) => Math.round(size * 1.5);
  if (tile.status) {
    const live = tile.status === "live";
    const label = live ? "운영 중" : "개발 중";
    const pw = measure(label, S.pill, 700) + 44, ph = S.pill * 2;
    if (draw) {
      parts.push(`<rect x="${x + w - S.pad - pw}" y="${y - 2}" width="${pw}" height="${ph}" rx="${ph / 2}" fill="${live ? ink.accent : ink.chip}"/>`);
      parts.push(`<rect x="${x + w - S.pad - pw + 14}" y="${y - 2 + ph / 2 - 4}" width="8" height="8" rx="2" fill="${live ? ink.onAccent : ink.faint}"/>`);
      parts.push(c.text(x + w - S.pad - pw + 30, y - 2 + ph / 2 + S.pill * 0.36, label, { size: S.pill, weight: 700, fill: live ? ink.onAccent : ink.sub }));
    }
  }
  if (tile.title) {
    const lines = wrap(tile.title, S.title, inner - (tile.status ? 140 : 0));
    lines.forEach((line) => {
      y += S.title;
      if (draw) parts.push(c.text(x + S.pad, y, lineText(line), { size: S.title, weight: 800, fill: ink.ink }));
      y += lh(S.title) - S.title;
    });
  }
  if (tile.meta) {
    y += 4;
    for (const line of wrap(tile.meta, S.meta, inner)) {
      y += S.meta;
      if (draw) parts.push(c.text(x + S.pad, y, lineText(line), { size: S.meta, weight: 700, fill: ink.accentText }));
      y += lh(S.meta) - S.meta;
    }
  }
  if (tile.big) {
    // 칸보다 길면(메일 주소 등) 칸 폭에 맞춰 줄인다
    const want = measure(tile.big, 1, 900) + (tile.unit ? measure(` ${tile.unit}`, 1, 700) : 0);
    const size = Math.min(S.big, Math.floor((inner * 0.97) / want));
    y += size * 0.95;
    if (draw) parts.push(c.rich(x + S.pad - 2, y, [[tile.big, { weight: 900, fill: ink.ink }], [tile.unit ? ` ${tile.unit}` : "", { weight: 700, fill: ink.sub }]], { size }));
    y += 14;
  }
  if (tile.label) {
    for (const line of wrap(tile.label, S.label, inner)) {
      y += S.label;
      if (draw) parts.push(c.text(x + S.pad, y, lineText(line), { size: S.label, weight: 700, fill: ink.sub }));
      y += lh(S.label) - S.label;
    }
  }
  if (tile.text) {
    y += 10;
    for (const line of wrap(tile.text, S.text, inner)) {
      y += S.text;
      if (draw) parts.push(richLine(c, x + S.pad, y, line, S.text, ink.sub, ink.ink));
      y += lh(S.text) - S.text;
    }
  }
  if (tile.share) {
    y += 16;
    if (draw) {
      parts.push(c.rich(x + S.pad, y + S.label, [[`커밋 ${tile.share.commits}건`, { weight: 800, fill: ink.ink }], [`  ·  ${tile.share.pct}%`, { weight: 700, fill: ink.sub }]], { size: S.label }));
      const ty = y + S.label + 14;
      parts.push(`<rect x="${x + S.pad}" y="${ty}" width="${inner}" height="8" rx="4" fill="${ink.chip}"/>`);
      parts.push(`<rect x="${x + S.pad}" y="${ty}" width="${(inner * tile.share.pct) / 100}" height="8" rx="4" fill="${ink.bar}"/>`);
    }
    y += S.label + 22;
  }
  if (tile.bullets) {
    y += 14;
    for (const b of tile.bullets) {
      const lines = wrap(b, S.bullet, inner - 24);
      lines.forEach((line, i) => {
        y += S.bullet;
        if (draw) {
          if (i === 0) parts.push(`<rect x="${x + S.pad}" y="${y - S.bullet * 0.55}" width="8" height="8" rx="2" fill="${ink.bar}"/>`);
          parts.push(richLine(c, x + S.pad + 24, y, line, S.bullet, ink.sub, ink.ink));
        }
        y += lh(S.bullet) - S.bullet;
      });
      y += 6;
    }
  }
  if (tile.stats) {
    y += 18;
    const sw = (inner - 16) / tile.stats.length;
    tile.stats.forEach(([v, l], i) => {
      const sx = x + S.pad + i * (sw + 16);
      const vs = Math.min(S.stat, Math.floor((sw - 36) / measure(v, 1, 900)));
      if (draw) {
        parts.push(`<rect x="${sx}" y="${y}" width="${sw}" height="${S.stat + S.statLabel + 44}" rx="12" fill="${ink.chip}"/>`);
        parts.push(c.text(sx + 18, y + 16 + S.stat, v, { size: vs, weight: 900, fill: ink.ink }));
        parts.push(c.text(sx + 18, y + 28 + S.stat + S.statLabel, l, { size: S.statLabel, weight: 700, fill: ink.faint }));
      }
    });
    y += S.stat + S.statLabel + 44;
  }
  if (tile.foot) {
    y += 16;
    for (const line of wrap(tile.foot, S.foot, inner)) {
      y += S.foot;
      if (draw) parts.push(c.text(x + S.pad, y, lineText(line), { size: S.foot, weight: 700, fill: ink.faint }));
      y += lh(S.foot) - S.foot;
    }
  }
  return { height: y - box.y + S.pad, parts };
}

// 단계 흐름(일하는 방식): 데스크톱은 한 줄, 휴대폰은 두 칸씩
function steps(c, list, box, S, ink, mobile, draw) {
  const parts = [];
  const per = mobile ? 2 : list.length, gap = mobile ? 14 : 34;
  const sw = (box.w - S.pad * 2 - gap * (per - 1)) / per, sh = mobile ? 132 : 112;
  list.forEach(([name, sub], i) => {
    const sx = box.x + S.pad + (i % per) * (sw + gap), sy = box.y + S.pad + Math.floor(i / per) * (sh + 14);
    if (!draw) return;
    parts.push(`<rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" rx="12" fill="${i === list.length - 1 ? ink.accent : ink.chip}"/>`);
    const on = i === list.length - 1;
    parts.push(c.text(sx + 18, sy + 22 + S.title * 0.9, name, { size: S.title * 0.92, weight: 800, fill: on ? ink.onAccent : ink.ink }));
    parts.push(c.text(sx + 18, sy + 40 + S.title * 0.9 + S.meta, sub, { size: S.meta, weight: 700, fill: on ? ink.onAccent : ink.faint }));
    if (!mobile && i < list.length - 1) parts.push(c.text(sx + sw + gap / 2, sy + sh / 2 + 10, "→", { size: 26, weight: 800, fill: ink.faint, anchor: "middle" }));
  });
  const rows = Math.ceil(list.length / per);
  return { height: S.pad * 2 + rows * sh + (rows - 1) * 14, parts };
}

// rows: [[tile, …], …] 또는 { steps: [...] }. tile.fill: "field" | "accent" | 없음
export async function renderBoard(themeName, t, rows, { mobile = false, title, desc }) {
  const S = SIZES[mobile ? "mobile" : "desktop"];
  const B = BOARD[themeName];
  const c = new Canvas({ width: S.W, height: 10, title, desc });
  const inks = {
    tile: { ink: t.ink, sub: t.sub, faint: t.faint, accentText: t.accent, chip: B.tile2, bar: t.accent, accent: t.accent, onAccent: themeName === "dark" ? "#161C1A" : "#FFFFFF" },
    field: { ink: FIELD.ink, sub: FIELD.sub, faint: FIELD.sub, accentText: FIELD.accent, chip: "#28322F", bar: FIELD.accent, accent: FIELD.accent, onAccent: "#161C1A" },
    accent: { ink: ACCENT.ink, sub: ACCENT.sub, faint: ACCENT.sub, accentText: ACCENT.ink, chip: "#B9D6CB", bar: ACCENT.ink, accent: ACCENT.ink, onAccent: ACCENT.fill },
  };
  const fills = { tile: B.tile, field: FIELD.fill, accent: ACCENT.fill };
  // 휴대폰은 타일마다 한 줄
  const flat = mobile ? rows.flatMap((r) => (Array.isArray(r) ? r.map((tile) => [tile]) : [r])) : rows;
  const parts = [];
  let y = S.m;
  const inner = S.W - S.m * 2;
  for (const row of flat) {
    if (!Array.isArray(row)) {
      const box = { x: S.m, y, w: inner };
      const ink = inks.tile;
      const { height } = steps(c, row.steps, box, S, ink, mobile, false);
      parts.push(`<rect x="${box.x}" y="${y}" width="${inner}" height="${height}" rx="14" fill="${B.tile}"/>`);
      parts.push(...steps(c, row.steps, box, S, ink, mobile, true).parts);
      y += height + S.g;
      continue;
    }
    const spans = row.map((tile) => tile.span || 1);
    const unit = (inner - S.g * (row.length - 1)) / spans.reduce((a, b) => a + b, 0);
    let x = S.m;
    const boxes = row.map((tile, i) => {
      const w = unit * spans[i] + S.g * (spans[i] - 1);
      const box = { x, y, w };
      x += w + S.g;
      return box;
    });
    const h = Math.max(...row.map((tile, i) => tileContent(c, tile, boxes[i], S, inks[tile.fill || "tile"], false).height));
    row.forEach((tile, i) => {
      const kind = tile.fill || "tile";
      parts.push(`<rect x="${boxes[i].x.toFixed(1)}" y="${y}" width="${boxes[i].w.toFixed(1)}" height="${h}" rx="14" fill="${fills[kind]}"/>`);
      parts.push(...tileContent(c, tile, boxes[i], S, inks[kind], true).parts);
    });
    y += h + S.g;
  }
  const H = Math.round(y - S.g + S.m);
  const out = new Canvas({ width: S.W, height: H, title, desc });
  out.used = c.used;
  return out.render([`<rect width="${S.W}" height="${H}" rx="24" fill="${B.bg}"/>`, ...parts].join("\n"));
}
