// 프로필 그림 여섯 장. 각 함수는 (테마 색, 자료) 를 받아 SVG 문자열을 돌려준다.
import { Canvas, fmt } from "./design.mjs";

const W = 1200;

// 'YYYY-MM-DD' 를 UTC 정오 날짜로 (시간대에 흔들리지 않게)
const day = (s) => new Date(`${s}T12:00:00Z`);
const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => new Date(d.getTime() + n * 86400000);
const mondayOf = (d) => addDays(d, -((d.getUTCDay() + 6) % 7));

function weeks(company) {
  const start = mondayOf(day(company.firstDay));
  const end = day(company.lastDay);
  const out = [];
  for (let w = start; w <= end; w = addDays(w, 7)) {
    let sum = 0;
    for (let i = 0; i < 7; i++) sum += company.daily[iso(addDays(w, i))] || 0;
    out.push({ start: w, commits: sum, partial: addDays(w, 6) > end });
  }
  return out;
}

// 칸 색이 밝으면 짙은 글자, 어두우면 밝은 글자
const isLight = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b > 150;
};

const level = (value, max) => (value === 0 ? 0 : Math.min(4, 1 + Math.floor((value / max) * 3.999)));

const pillWidth = (label, size) =>
  [...label].reduce((w, ch) => w + (/[가-힣]/.test(ch) ? size * 0.95 : ch === " " ? size * 0.28 : size * 0.56), 0);

// 1. 첫 화면: 이름·한 줄 소개·주력 기술 + 주별 커밋을 초콜릿 바로
export async function hero(t, profile, company) {
  const c = new Canvas({ width: W, height: 440, title: `${profile.name} ${profile.nameEn} — ${profile.role}`, desc: `${profile.tagline.join(" ")} 아이엔지스토리 ${weeks(company).length}주 동안 커밋 ${fmt(company.commits)}건.` });
  const parts = [];
  parts.push(`<rect x="0.5" y="0.5" width="${W - 1}" height="439" rx="20" fill="${t.surface}" stroke="${t.line}"/>`);
  parts.push(`<circle cx="64" cy="66" r="5" fill="${t.accent}" class="pulse"/>`);
  parts.push(c.mono(80, 71, profile.role, { size: 14, fill: t.accent, spacing: 2 }));
  parts.push(c.text(58, 178, profile.name, { size: 96, weight: 800, fill: t.ink, spacing: -2 }));
  parts.push(c.mono(366, 176, profile.nameEn, { size: 18, fill: t.sub, spacing: 3 }));
  profile.tagline.forEach((line, i) => parts.push(c.text(62, 240 + i * 38, line, { size: 27, weight: 700, fill: i ? t.sub : t.ink, spacing: -0.5 })));

  let x = 62;
  for (const chip of profile.chips) {
    const w = Math.round(pillWidth(chip, 14) + 28);
    parts.push(`<rect x="${x}" y="334" width="${w}" height="32" rx="16" fill="${t.sunken}" stroke="${t.line}"/>`);
    parts.push(c.text(x + w / 2, 355, chip, { size: 14, weight: 700, fill: t.ink, anchor: "middle" }));
    x += w + 8;
  }
  parts.push(c.mono(62, 404, profile.footer, { size: 14, fill: t.faint, spacing: 2 }));

  // 오른쪽: 4×3 초콜릿 바. 칸 하나가 한 주, 진할수록 커밋이 많은 주
  const list = weeks(company).slice(-12);
  const max = Math.max(...list.map((w) => w.commits));
  const bx = 742, by = 52, cols = 4, gap = 10, cw = 94, ch = 92;
  const bw = cols * cw + (cols - 1) * gap + 28, bh = 3 * ch + 2 * gap + 28;
  parts.push(`<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="18" fill="${t.bar.shade}"/>`);
  parts.push(`<rect x="${bx}" y="${by}" width="${bw}" height="${bh - 6}" rx="18" fill="${t.bar.base}"/>`);
  list.forEach((w, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const sx = bx + 14 + col * (cw + gap), sy = by + 14 + row * (ch + gap);
    const lv = Math.max(1, level(w.commits, max));
    const fill = t.heat[lv];
    const dark = !isLight(fill);
    const ink = dark ? t.bar.text : t.bar.shade;
    parts.push(`<g class="seg" style="animation-delay:${(i * 0.06).toFixed(2)}s">`);
    parts.push(`<rect x="${sx}" y="${sy}" width="${cw}" height="${ch}" rx="10" fill="${t.bar.shade}" opacity="0.55"/>`);
    parts.push(`<rect x="${sx}" y="${sy}" width="${cw}" height="${ch - 4}" rx="10" fill="${fill}"${w.partial ? ` stroke="${t.accent}" stroke-width="2" stroke-dasharray="5 4"` : ""}/>`);
    parts.push(`<rect x="${sx + 6}" y="${sy + 5}" width="${cw - 12}" height="3" rx="1.5" fill="#FFFFFF" opacity="${dark ? 0.16 : 0.5}"/>`);
    const label = `${String(w.start.getUTCMonth() + 1).padStart(2, "0")}.${String(w.start.getUTCDate()).padStart(2, "0")}`;
    parts.push(c.mono(sx + 12, sy + 27, label, { size: 13, fill: ink, extra: ` opacity="0.75"` }));
    parts.push(c.mono(sx + 12, sy + 68, fmt(w.commits), { size: 26, weight: 800, fill: ink }));
    parts.push(`</g>`);
  });
  parts.push(c.mono(bx + bw, by + bh + 26, `WEEKLY COMMITS · ${list.length} WEEKS · ${fmt(company.commits)}`, { size: 13, fill: t.faint, anchor: "end", spacing: 1 }));

  const css = `.seg{transform-box:fill-box;transform-origin:center;animation:pop .7s cubic-bezier(.2,.8,.2,1) both}@keyframes pop{from{opacity:0;transform:translateY(6px) scale(.94)}to{opacity:1;transform:none}}.pulse{transform-box:fill-box;transform-origin:center;animation:pulse 2.4s ease-in-out infinite}@keyframes pulse{50%{opacity:.35;transform:scale(.7)}}`;
  return c.render(parts.join("\n"), { css });
}

// 2. 숫자 다섯 개
export async function stats(t, profile, company) {
  const cardTotal = Object.values(company.cards).reduce((a, b) => a + b, 0);
  const tiles = [
    { value: profile.careerYears, unit: "년", label: "개발 경력", sub: profile.careerSince },
    { value: fmt(company.commits), unit: "", label: "회사 커밋", sub: `${company.firstDay.slice(5).replace("-", ".")} → ${company.lastDay.slice(5).replace("-", ".")}` },
    { value: String(company.activeDays), unit: "일", label: "커밋한 날", sub: `최다 ${company.peak.day.slice(5).replace("-", ".")} · ${company.peak.commits}건` },
    { value: String(company.repos), unit: "곳", label: "사내 저장소", sub: "코어 1 · 서비스 6 · 상담 1" },
    { value: fmt(cardTotal), unit: "장", label: "작업 카드", sub: "기능 · 버그 · 운영 · 결정" },
  ];
  const c = new Canvas({ width: W, height: 168, title: "By the Numbers", desc: tiles.map((x) => `${x.label} ${x.value}${x.unit}`).join(" · ") });
  const parts = [];
  const gap = 12, tw = (W - gap * (tiles.length - 1)) / tiles.length;
  tiles.forEach((tile, i) => {
    const x = i * (tw + gap);
    parts.push(`<rect x="${x + 0.5}" y="0.5" width="${tw - 1}" height="167" rx="16" fill="${t.surface}" stroke="${t.line}"/>`);
    parts.push(c.text(x + 22, 40, tile.label, { size: 16, weight: 700, fill: t.sub }));
    parts.push(c.rich(x + 20, 100, [[tile.value, { family: "mono", weight: 800, fill: i === 1 ? t.accent : t.ink }], [tile.unit ? ` ${tile.unit}` : "", { weight: 700, fill: t.sub }]], { size: 46 }));
    parts.push(c.text(x + 22, 140, tile.sub, { size: 15, weight: 500, fill: t.faint }));
  });
  return c.render(parts.join("\n"));
}

// 3. 일별 커밋 막대 + 누적 선
export async function daily(t, profile, company) {
  const H = 330;
  const c = new Canvas({ width: W, height: H, title: "아이엔지스토리 일별 커밋", desc: `${company.firstDay}부터 ${company.lastDay}까지 하루 커밋 수와 누적. 최다일 ${company.peak.day} ${company.peak.commits}건.` });
  const parts = [`<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="20" fill="${t.surface}" stroke="${t.line}"/>`];
  parts.push(c.text(32, 46, "아이엔지스토리 일별 커밋", { size: 20, weight: 800, fill: t.ink }));
  parts.push(c.text(32, 72, "막대는 하루, 선은 누적입니다.", { size: 15, weight: 500, fill: t.faint }));
  parts.push(`<rect x="${W - 262}" y="36" width="12" height="12" rx="3" fill="${t.heat[3]}"/>`);
  parts.push(c.text(W - 244, 47, "하루", { size: 13, weight: 700, fill: t.sub }));
  parts.push(`<line x1="${W - 186}" y1="42" x2="${W - 162}" y2="42" stroke="${t.accent}" stroke-width="3" stroke-linecap="round"/>`);
  parts.push(c.text(W - 154, 47, `누적 ${fmt(company.commits)}`, { size: 13, weight: 700, fill: t.sub }));

  const start = mondayOf(day(company.firstDay));
  const end = day(company.lastDay);
  const n = Math.round((end - start) / 86400000) + 1;
  const left = 56, right = W - 72, top = 100, bottom = H - 52;
  const step = (right - left) / n;
  const maxDay = Math.ceil(company.peak.commits / 50) * 50;
  const maxCum = Math.ceil(company.commits / 500) * 500;
  const y = (v) => bottom - (v / maxDay) * (bottom - top);
  const yc = (v) => bottom - (v / maxCum) * (bottom - top);

  for (let g = 0; g <= maxDay; g += maxDay / 3) {
    parts.push(`<line x1="${left}" x2="${right}" y1="${y(g).toFixed(1)}" y2="${y(g).toFixed(1)}" stroke="${t.line}" stroke-dasharray="${g ? "2 4" : "0"}"/>`);
    parts.push(c.mono(left - 10, y(g) + 5, String(g), { size: 13, fill: t.faint, anchor: "end" }));
  }
  for (let cv = 0; cv <= maxCum; cv += 1000) parts.push(c.mono(right + 10, yc(cv) + 5, fmt(cv), { size: 13, fill: t.accent, extra: ` opacity="0.7"` }));
  let cum = 0;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const d = addDays(start, i);
    const v = company.daily[iso(d)] || 0;
    cum += v;
    const x = left + i * step;
    if (v) {
      const lv = level(v, company.peak.commits);
      parts.push(`<rect class="b" style="animation-delay:${(i * 0.008).toFixed(3)}s" x="${(x + step * 0.15).toFixed(1)}" y="${y(v).toFixed(1)}" width="${(step * 0.7).toFixed(1)}" height="${(bottom - y(v)).toFixed(1)}" rx="2" fill="${t.heat[Math.max(2, lv)]}"/>`);
    }
    if (d >= day(company.firstDay)) pts.push(`${(x + step / 2).toFixed(1)},${yc(cum).toFixed(1)}`);
    if (d.getUTCDate() === 1 || i === 0) {
      const label = `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      parts.push(`<line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${bottom}" y2="${bottom + 6}" stroke="${t.faint}"/>`);
      parts.push(c.mono(x, bottom + 26, label, { size: 14, fill: t.sub }));
    }
  }
  parts.push(`<polyline points="${pts.join(" ")}" fill="none" stroke="${t.accent}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" class="line"/>`);

  const pi = Math.round((day(company.peak.day) - start) / 86400000);
  const px = left + pi * step + step / 2, py = y(company.peak.commits);
  parts.push(`<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="4" fill="${t.accent}"/>`);
  parts.push(c.mono(px - 10, py - 4, `${company.peak.day.slice(5).replace("-", ".")} · ${company.peak.commits}`, { size: 14, fill: t.accent, anchor: "end" }));

  const css = `.b{transform-box:fill-box;transform-origin:bottom;animation:grow .6s cubic-bezier(.2,.8,.2,1) both}@keyframes grow{from{transform:scaleY(0)}}.line{stroke-dasharray:4000;stroke-dashoffset:4000;animation:draw 2.2s .3s ease-out forwards}@keyframes draw{to{stroke-dashoffset:0}}`;
  return c.render(parts.join("\n"), { css });
}

// 5. 경력 연표: 위는 회사, 아래는 공부
export async function timeline(t, profile, company) {
  const H = 250;
  const c = new Canvas({ width: W, height: H, title: "경력 연표", desc: profile.career.map((e) => `${e.label} ${e.from}~${e.to === "now" ? "현재" : e.to}`).join(" · ") });
  const parts = [`<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="20" fill="${t.surface}" stroke="${t.line}"/>`];
  const from = new Date(Date.UTC(2020, 9, 1)), to = new Date(Date.UTC(2027, 0, 1));
  const left = 40, right = W - 40;
  const xOf = (s) => {
    // "지금"은 실행 시각이 아니라 자료의 마지막 날 — 같은 자료면 같은 그림
    const d = s === "now" ? day(company.lastDay) : new Date(`${s}-01T00:00:00Z`);
    return left + ((d - from) / (to - from)) * (right - left);
  };
  const endOf = (s) => (s === "now" ? xOf("now") : xOf(s) + ((right - left) / ((to - from) / 86400000)) * 30);
  const axisY = 196;
  parts.push(`<line x1="${left}" x2="${right}" y1="${axisY}" y2="${axisY}" stroke="${t.line}" stroke-width="2"/>`);
  for (let yr = 2021; yr <= 2026; yr++) {
    const x = xOf(`${yr}-01`);
    parts.push(`<line x1="${x}" x2="${x}" y1="${axisY - 4}" y2="${axisY + 4}" stroke="${t.faint}"/>`);
    parts.push(c.mono(x, axisY + 26, String(yr), { size: 14, fill: t.sub, anchor: "middle" }));
  }
  for (const e of profile.career) {
    const x1 = xOf(e.from), x2 = endOf(e.to);
    const y = e.row === 0 ? 88 : 150;
    const h = e.row === 0 ? 26 : 12;
    // 이웃 막대와 이어 붙지 않게 3px 띄우고, 이름표를 아래에 단 짧은 막대는 다른 색으로
    const fill = e.current ? t.accent : e.labelBelow ? t.heat[2] : e.row === 0 ? t.heat[3] : t.heat[1];
    parts.push(`<rect x="${x1.toFixed(1)}" y="${y}" width="${Math.max(10, x2 - x1 - 3).toFixed(1)}" height="${h}" rx="${h / 2}" fill="${fill}"${e.current ? ` class="now"` : ""}/>`);
    // 같은 해에 끝나면 끝 달만 적어 짧은 막대의 글자가 옆 막대와 겹치지 않게
    const sameYear = e.to !== "now" && e.to.slice(0, 4) === e.from.slice(0, 4);
    const period = `${e.from.replace("-", ".")} – ${e.to === "now" ? "지금" : sameYear ? e.to.slice(5) : e.to.replace("-", ".")}`;
    const anchor = e.current ? "end" : "start";
    const lx = e.current ? x2 : x1;
    if (e.row === 0 && e.labelBelow) {
      // 짧은 막대가 이웃 이름표와 겹치면 막대 아래에 적는다
      parts.push(c.rich(x2 - 3, y + h + 22, [[e.label, { weight: 800, fill: t.ink }], [`  ${period}`, { family: "mono", weight: 700, fill: t.faint }]], { size: 14, anchor: "end" }));
    } else if (e.row === 0) {
      parts.push(c.text(lx, y - 30, e.label, { size: 17, weight: 800, fill: e.current ? t.accent : t.ink, anchor }));
      parts.push(c.mono(lx, y - 10, period, { size: 13, fill: t.faint, anchor }));
    } else {
      parts.push(c.rich(x1, y + 32, [[e.label, { weight: 700, fill: t.sub }], [`  ${period}`, { family: "mono", weight: 700, fill: t.faint }]], { size: 14 }));
    }
  }
  const css = `.now{animation:glow 2.4s ease-in-out infinite}@keyframes glow{50%{opacity:.55}}`;
  return c.render(parts.join("\n"), { css });
}

// 6. 구분선: 가운데 초콜릿 세 조각
export async function divider(t) {
  const c = new Canvas({ width: W, height: 28, title: "divider", desc: "구분선" });
  const mid = W / 2;
  const parts = [
    `<line x1="40" x2="${mid - 52}" y1="14" y2="14" stroke="${t.line}" stroke-width="1.5"/>`,
    `<line x1="${mid + 52}" x2="${W - 40}" y1="14" y2="14" stroke="${t.line}" stroke-width="1.5"/>`,
    ...[-1, 0, 1].map((k) => `<rect x="${mid + k * 30 - 10}" y="4" width="20" height="20" rx="5" fill="${t.heat[k === 0 ? 4 : 2]}"/>`),
  ];
  return c.render(parts.join("\n"));
}

// 7. 기술 스택: 바깥 아이콘 서비스 없이 simple-icons(CC0) 모양을 초콜릿 톤 한 색으로
export async function stack(t, profile) {
  const icons = await import("simple-icons");
  const rows = profile.stack;
  const rowH = 118, H = rows.length * rowH + 20;
  const c = new Canvas({ width: W, height: H, title: "기술 스택", desc: rows.map((r) => `${r.group}: ${r.items.map(([n]) => n).join(", ")}`).join(" / ") });
  const parts = [];
  const left = 176, tile = 112, gap = 15;
  rows.forEach((r, ri) => {
    const y = 10 + ri * rowH;
    parts.push(c.text(4, y + 50, r.group, { size: 18, weight: 800, fill: t.ink }));
    parts.push(c.mono(4, y + 74, `0${ri + 1}`, { size: 13, fill: t.faint }));
    r.items.forEach(([name, key], i) => {
      const x = left + i * (tile + gap);
      parts.push(`<g>`);
      parts.push(`<rect x="${x + 0.5}" y="${y + 0.5}" width="${tile - 1}" height="${rowH - 19}" rx="16" fill="${t.surface}" stroke="${t.line}"/>`);
      const icon = key && icons[key];
      if (icon) {
        parts.push(`<g transform="translate(${x + tile / 2 - 15} ${y + 18}) scale(1.25)"><path d="${icon.path}" fill="${t.bar.base === "#5E3220" ? t.heat[4] : t.bar.base}"/></g>`);
      } else {
        parts.push(c.mono(x + tile / 2, y + 42, name === "AWS" ? "AWS" : "PW", { size: 20, weight: 800, fill: t.bar.base === "#5E3220" ? t.heat[4] : t.bar.base, anchor: "middle" }));
      }
      parts.push(c.text(x + tile / 2, y + 80, name, { size: 14, weight: 700, fill: t.sub, anchor: "middle" }));
      parts.push(`</g>`);
    });
  });
  return c.render(parts.join("\n"));
}
