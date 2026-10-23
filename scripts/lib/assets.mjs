// 프로필 그림. 각 함수는 (테마 색, 프로필, 회사 자료) 를 받아 SVG 문자열을 돌려준다.
// 장식(고정폭 캡션·번호·가는 테두리·깜빡임) 없이, 채운 면과 큰 글자와 실제 숫자로만 짓는다.
import { Canvas, fmt } from "./design.mjs";

const W = 1200;

// 'YYYY-MM-DD' 를 UTC 정오 날짜로 (시간대에 흔들리지 않게)
const day = (s) => new Date(`${s}T12:00:00Z`);
const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => new Date(d.getTime() + n * 86400000);
const mondayOf = (d) => addDays(d, -((d.getUTCDay() + 6) % 7));
const mmdd = (d) => `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`;

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

const level = (value, max) => (value === 0 ? 0 : Math.min(4, 1 + Math.floor((value / max) * 3.999)));

// 칸 색이 밝으면 짙은 글자, 어두우면 밝은 글자
const isLight = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b > 150;
};

const textWidth = (label, size) =>
  [...label].reduce((w, ch) => w + (/[가-힣]/.test(ch) ? size * 0.92 : ch === " " ? size * 0.26 : /[0-9]/.test(ch) ? size * 0.6 : size * 0.55), 0);

// 1. 첫 화면: 코코아 바탕 전체, 이름과 한 줄 소개, 주별 커밋을 초콜릿 바로
export async function hero(t, profile, company) {
  const list = weeks(company).slice(-12);
  const H = 460;
  const f = t.field;
  const c = new Canvas({ width: W, height: H, title: `${profile.name} — ${profile.roleLine}`, desc: `${profile.tagline.join(" ")} 오른쪽 초콜릿 바는 아이엔지스토리 ${list.length}주 동안 주마다 남긴 커밋 수(합계 ${fmt(company.commits)}건)입니다.` });
  const parts = [`<rect width="${W}" height="${H}" rx="24" fill="${f.bg}"/>`];
  parts.push(c.text(64, 168, profile.name, { size: 112, weight: 800, fill: f.ink, spacing: -3 }));
  parts.push(c.text(68, 222, profile.roleLine, { size: 24, weight: 700, fill: f.mint }));
  profile.tagline.forEach((line, i) => parts.push(c.text(68, 296 + i * 42, line, { size: 29, weight: 700, fill: i ? f.sub : f.ink, spacing: -0.4 })));
  parts.push(c.text(68, 408, profile.contact, { size: 19, weight: 500, fill: f.sub }));

  // 4×3 초콜릿 바. 칸 하나가 한 주, 진할수록 커밋이 많은 주
  const max = Math.max(...list.map((w) => w.commits));
  const cols = 4, gap = 10, cw = 92, ch = 88;
  const bw = cols * cw + (cols - 1) * gap + 32, bh = 3 * ch + 2 * gap + 32;
  const bx = W - 56 - bw, by = 44;
  parts.push(`<rect x="${bx}" y="${by + 8}" width="${bw}" height="${bh}" rx="20" fill="#000" opacity="0.28"/>`);
  parts.push(`<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="20" fill="${f.mold}"/>`);
  list.forEach((w, i) => {
    const sx = bx + 16 + (i % cols) * (cw + gap), sy = by + 16 + Math.floor(i / cols) * (ch + gap);
    const fill = f.heat[Math.max(0, level(w.commits, max))];
    const ink = isLight(fill) ? f.mold : f.ink;
    parts.push(`<g class="seg" style="animation-delay:${(i * 0.07).toFixed(2)}s">`);
    parts.push(`<rect x="${sx}" y="${sy + 4}" width="${cw}" height="${ch - 4}" rx="12" fill="#000" opacity="0.35"/>`);
    parts.push(`<rect x="${sx}" y="${sy}" width="${cw}" height="${ch - 4}" rx="12" fill="${fill}"/>`);
    parts.push(`<rect x="${sx + 8}" y="${sy + 6}" width="${cw - 16}" height="5" rx="2.5" fill="#FFF" opacity="${isLight(fill) ? 0.4 : 0.14}"/>`);
    parts.push(c.text(sx + 14, sy + 34, `${w.start.getUTCMonth() + 1}.${w.start.getUTCDate()}`, { size: 14, weight: 700, fill: ink, extra: ` opacity="0.8"` }));
    parts.push(c.text(sx + 14, sy + 70, fmt(w.commits), { size: 28, weight: 800, fill: ink }));
    if (w.partial) parts.push(`<rect x="${sx + 1.5}" y="${sy + 1.5}" width="${cw - 3}" height="${ch - 7}" rx="11" fill="none" stroke="${f.mint}" stroke-width="3"/>`);
    parts.push(`</g>`);
  });
  parts.push(c.text(bx + bw, by + bh + 46, `아이엔지스토리 ${list.length}주, 한 칸이 한 주의 커밋입니다`, { size: 17, weight: 500, fill: f.sub, anchor: "end" }));
  parts.push(c.rich(bx + bw, by + bh + 74, [["민트 테두리", { weight: 700, fill: f.mint }], ["는 아직 끝나지 않은 이번 주", { weight: 500, fill: f.sub }]], { size: 15, anchor: "end" }));

  const css = `.seg{transform-box:fill-box;transform-origin:center;animation:pop .8s cubic-bezier(.2,.8,.2,1) both}@keyframes pop{from{opacity:0;transform:translateY(8px) scale(.94)}to{opacity:1;transform:none}}`;
  return c.render(parts.join("\n"), { css });
}

// 2. 숫자 다섯 개: 테두리 없이 한 장의 돌 표면 위에
export async function stats(t, profile, company) {
  const cardTotal = Object.values(company.cards).reduce((a, b) => a + b, 0);
  const tiles = [
    { label: "개발 경력", value: profile.careerYears, unit: "년", sub: profile.careerSince },
    { label: "회사 커밋", value: fmt(company.commits), unit: "건", sub: "2026년 8월부터" },
    { label: "커밋한 날", value: String(company.activeDays), unit: "일", sub: `가장 많은 날 ${company.peak.commits}건` },
    { label: "사내 저장소", value: String(company.repos), unit: "곳", sub: "코어 · 서비스 · 상담" },
    { label: "작업 카드", value: fmt(cardTotal), unit: "장", sub: "기능 · 버그 · 운영 · 결정" },
  ];
  const H = 190;
  const c = new Canvas({ width: W, height: H, title: "숫자로 본 지금", desc: tiles.map((x) => `${x.label} ${x.value}${x.unit}`).join(", ") });
  const parts = [`<rect width="${W}" height="${H}" rx="24" fill="${t.surface}"/>`];
  const cw = (W - 64) / tiles.length;
  tiles.forEach((tile, i) => {
    const x = 40 + i * cw;
    if (i) parts.push(`<rect x="${x - 14}" y="44" width="4" height="${H - 88}" rx="2" fill="${t.surface2}"/>`);
    parts.push(c.text(x + 4, 56, tile.label, { size: 17, weight: 700, fill: t.sub }));
    parts.push(c.rich(x, 118, [[tile.value, { weight: 800, fill: t.ink }], [` ${tile.unit}`, { weight: 700, fill: t.sub }]], { size: 50 }));
    parts.push(c.text(x + 4, 152, tile.sub, { size: 15, weight: 500, fill: t.faint }));
  });
  return c.render(parts.join("\n"));
}

// 3. 한 틀로 찍어내는 구조: 위는 공통 코어(틀), 가운데는 찍혀 나온 업종 서비스, 아래는 받침이 되는 인프라
export async function mold(t, profile) {
  const m = profile.mold;
  const f = t.field;
  const H = 618;
  const c = new Canvas({
    width: W,
    height: H,
    title: "한 틀로 찍어내는 서비스",
    desc: `${m.core.title}(${m.core.parts.join(", ")})에서 ${m.services.join(", ")} 서비스를 찍어내고, ${m.base.title}(${m.base.line}) 위에서 운영합니다.`,
  });
  const parts = [`<rect width="${W}" height="${H}" rx="24" fill="${t.surface}"/>`];

  // 틀: 코코아 판에 일곱 칸이 파여 있다
  const mx = 40, my = 40, mw = W - 80, mh = 196;
  parts.push(`<rect x="${mx}" y="${my}" width="${mw}" height="${mh}" rx="20" fill="${f.bg}"/>`);
  parts.push(c.text(mx + 32, my + 52, m.core.title, { size: 28, weight: 800, fill: f.ink }));
  parts.push(c.text(mx + 32 + textWidth(m.core.title, 28) + 18, my + 51, m.core.sub, { size: 17, weight: 500, fill: f.sub }));
  parts.push(c.text(mx + mw - 32, my + 51, m.core.note, { size: 17, weight: 700, fill: f.mint, anchor: "end" }));
  const n = m.core.parts.length, pg = 12, pw = (mw - 64 - pg * (n - 1)) / n;
  m.core.parts.forEach((name, i) => {
    const px = mx + 32 + i * (pw + pg), py = my + 84;
    parts.push(`<rect x="${px.toFixed(1)}" y="${py}" width="${pw.toFixed(1)}" height="80" rx="14" fill="${f.mold}"/>`);
    parts.push(`<rect x="${(px + 6).toFixed(1)}" y="${py + 68}" width="${(pw - 12).toFixed(1)}" height="6" rx="3" fill="${f.heat[0]}"/>`);
    parts.push(c.text(px + pw / 2, py + 46, name, { size: name.length > 6 ? 16 : 18, weight: 700, fill: f.ink, anchor: "middle" }));
  });

  // 찍혀 나온 바: 틀에서 흘러내린 줄기로 잇는다
  const sy = 296, sh = 150, sgap = 16, sn = m.services.length;
  const sw = (mw - sgap * (sn - 1)) / sn;
  m.services.forEach((name, i) => {
    const x = mx + i * (sw + sgap);
    const cx = x + sw / 2;
    parts.push(`<rect x="${(cx - 4).toFixed(1)}" y="${my + mh}" width="8" height="${sy - my - mh + 8}" rx="4" fill="${t.heat[2]}" opacity="0.7"/>`);
    parts.push(`<rect x="${x.toFixed(1)}" y="${sy + 6}" width="${sw.toFixed(1)}" height="${sh}" rx="16" fill="${t.heat[4]}" opacity="0.35"/>`);
    parts.push(`<rect x="${x.toFixed(1)}" y="${sy}" width="${sw.toFixed(1)}" height="${sh}" rx="16" fill="${t.heat[3]}"/>`);
    // 바의 홈 두 줄
    for (const k of [1, 2]) parts.push(`<rect x="${(x + 12).toFixed(1)}" y="${sy + 46 * k + 6}" width="${(sw - 24).toFixed(1)}" height="5" rx="2.5" fill="${t.heat[4]}" opacity="0.45"/>`);
    parts.push(c.text(cx, sy + 40, name, { size: 21, weight: 800, fill: "#FFF7F0", anchor: "middle" }));
    parts.push(c.text(cx, sy + sh - 22, m.serviceSub, { size: 13.5, weight: 700, fill: "#FFE9D8", anchor: "middle" }));
  });

  // 받침: 인프라 표준
  const by = sy + sh + 32, bh = H - by - 40;
  parts.push(`<rect x="${mx}" y="${by}" width="${mw}" height="${bh}" rx="20" fill="${t.surface2}"/>`);
  parts.push(c.text(mx + 32, by + bh / 2 + 9, m.base.title, { size: 24, weight: 800, fill: t.ink }));
  parts.push(c.text(mx + 32 + textWidth(m.base.title, 24) + 22, by + bh / 2 + 7, m.base.line, { size: 17, weight: 500, fill: t.sub }));
  return c.render(parts.join("\n"));
}

// 4. 전후 실측: 줄마다 전(옅게)과 후(진하게) 막대, 오른쪽에 바뀐 만큼
export async function metrics(t, profile) {
  const rows = profile.metrics;
  const rowH = 92, top = 36, H = top * 2 + rows.length * rowH - 12;
  const show = (v, r) => (r.unit === "분" ? v.toFixed(1) : String(v)) + r.unit;
  const c = new Canvas({ width: W, height: H, title: "전후 실측", desc: rows.map((r) => `${r.label}(${r.where}) ${show(r.before, r)} → ${r.afterText || show(r.after, r)}`).join(" / ") });
  const parts = [`<rect width="${W}" height="${H}" rx="24" fill="${t.surface}"/>`];
  const lx = 40, bx = 360, bw = 600;
  rows.forEach((r, i) => {
    const y = top + i * rowH;
    if (i) parts.push(`<rect x="${lx}" y="${y - 12}" width="${W - 80}" height="3" rx="1.5" fill="${t.surface2}"/>`);
    parts.push(c.text(lx, y + 32, r.label, { size: 23, weight: 800, fill: t.ink }));
    parts.push(c.text(lx, y + 60, r.where, { size: 15, weight: 500, fill: t.faint }));
    const scale = Math.max(r.before, r.after);
    const w1 = Math.max(6, (r.before / scale) * bw), w2 = Math.max(6, (r.after / scale) * bw);
    parts.push(`<rect x="${bx}" y="${y + 10}" width="${w1.toFixed(1)}" height="20" rx="6" fill="${t.heat[1]}"/>`);
    parts.push(c.text(bx + w1 + 10, y + 27, show(r.before, r), { size: 16, weight: 700, fill: t.sub }));
    parts.push(`<rect x="${bx}" y="${y + 38}" width="${w2.toFixed(1)}" height="20" rx="6" fill="${t.heat[4]}"/>`);
    parts.push(c.text(bx + w2 + 10, y + 55, r.afterText || show(r.after, r), { size: 16, weight: 800, fill: t.ink }));
    const delta = r.higherIsBetter ? `+${r.after - r.before}${r.unit}` : `−${Math.round((1 - r.after / r.before) * 100)}%`;
    parts.push(c.text(W - 40, y + 50, delta, { size: 36, weight: 800, fill: t.accent, anchor: "end" }));
  });
  return c.render(parts.join("\n"));
}

// 5. 일별 커밋 막대 + 누적 선. 격자선 없이 꼭 필요한 숫자만 그림 위에 적는다
export async function daily(t, profile, company) {
  const H = 340;
  const c = new Canvas({ width: W, height: H, title: "아이엔지스토리 일별 커밋", desc: `${company.firstDay}부터 ${company.lastDay}까지 하루 커밋 수와 누적. 가장 많은 날은 ${company.peak.day}, ${company.peak.commits}건.` });
  const parts = [`<rect width="${W}" height="${H}" rx="24" fill="${t.surface}"/>`];
  parts.push(c.text(40, 58, "하루하루 쌓인 커밋", { size: 26, weight: 800, fill: t.ink }));
  parts.push(c.rich(40, 88, [["막대", { weight: 700, fill: t.heat[3] }], ["는 하루, ", { fill: t.sub }], ["민트 선", { weight: 700, fill: t.accent }], ["은 누적입니다.", { fill: t.sub }]], { size: 17 }));

  const start = mondayOf(day(company.firstDay));
  const end = day(company.lastDay);
  const n = Math.round((end - start) / 86400000) + 1;
  const left = 40, right = W - 150, top = 120, bottom = H - 62;
  const step = (right - left) / n;
  const y = (v) => bottom - (v / company.peak.commits) * (bottom - top);
  const yc = (v) => bottom - (v / company.commits) * (bottom - top);
  let cum = 0;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const d = addDays(start, i);
    const v = company.daily[iso(d)] || 0;
    cum += v;
    const x = left + i * step;
    if (v) parts.push(`<rect x="${(x + step * 0.14).toFixed(1)}" y="${y(v).toFixed(1)}" width="${(step * 0.72).toFixed(1)}" height="${(bottom - y(v)).toFixed(1)}" rx="2.5" fill="${t.heat[Math.max(2, level(v, company.peak.commits))]}"/>`);
    if (d >= day(company.firstDay)) pts.push(`${(x + step / 2).toFixed(1)},${yc(cum).toFixed(1)}`);
    if (d.getUTCDate() === 1) parts.push(c.text(x, bottom + 34, `${d.getUTCMonth() + 1}월`, { size: 16, weight: 700, fill: t.sub }));
  }
  parts.push(`<rect x="${left}" y="${bottom}" width="${right - left}" height="3" rx="1.5" fill="${t.surface2}"/>`);
  parts.push(`<polyline points="${pts.join(" ")}" fill="none" stroke="${t.accent}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>`);
  const [ex, ey] = pts.at(-1).split(",").map(Number);
  parts.push(`<circle cx="${ex}" cy="${ey}" r="6" fill="${t.accent}"/>`);
  parts.push(c.text(ex + 16, ey + 2, fmt(company.commits), { size: 24, weight: 800, fill: t.accent }));
  parts.push(c.text(ex + 16, ey + 24, "누적", { size: 15, weight: 700, fill: t.sub }));

  const pi = Math.round((day(company.peak.day) - start) / 86400000);
  const px = left + pi * step + step / 2, py = y(company.peak.commits);
  parts.push(c.rich(px - 12, py + 4, [[`${mmdd(day(company.peak.day))} `, { weight: 700, fill: t.sub }], [`${company.peak.commits}건`, { weight: 800, fill: t.ink }]], { size: 16, anchor: "end" }));
  return c.render(parts.join("\n"));
}

// 6. 경력 연표: 위는 회사, 아래는 공부
export async function timeline(t, profile, company) {
  const H = 270;
  const c = new Canvas({ width: W, height: H, title: "경력 연표", desc: profile.career.map((e) => `${e.label} ${e.from}~${e.to === "now" ? "지금" : e.to}`).join(", ") });
  const parts = [`<rect width="${W}" height="${H}" rx="24" fill="${t.surface}"/>`];
  const from = new Date(Date.UTC(2020, 9, 1)), to = new Date(Date.UTC(2027, 0, 1));
  const left = 48, right = W - 48;
  // "지금"은 실행 시각이 아니라 자료의 마지막 날 — 같은 자료면 같은 그림
  const xOf = (s) => {
    const d = s === "now" ? day(company.lastDay) : new Date(`${s}-01T00:00:00Z`);
    return left + ((d - from) / (to - from)) * (right - left);
  };
  const endOf = (s) => (s === "now" ? xOf("now") : xOf(s) + ((right - left) / ((to - from) / 86400000)) * 30);
  const axisY = 214;
  parts.push(`<rect x="${left}" y="${axisY - 1.5}" width="${right - left}" height="3" rx="1.5" fill="${t.surface2}"/>`);
  for (let yr = 2021; yr <= 2026; yr++) parts.push(c.text(xOf(`${yr}-01`), axisY + 32, `${yr}`, { size: 16, weight: 700, fill: t.sub, anchor: "middle" }));
  for (const e of profile.career) {
    const x1 = xOf(e.from), x2 = endOf(e.to);
    const y = e.row === 0 ? 96 : 164;
    const h = e.row === 0 ? 30 : 14;
    // 이웃 막대와 이어 붙지 않게 4px 띄우고, 이름표를 아래에 단 짧은 막대는 다른 색으로
    const fill = e.current ? t.accent : e.labelBelow ? t.heat[2] : e.row === 0 ? t.heat[3] : t.heat[1];
    parts.push(`<rect x="${x1.toFixed(1)}" y="${y}" width="${Math.max(10, x2 - x1 - 4).toFixed(1)}" height="${h}" rx="${h / 2}" fill="${fill}"/>`);
    const sameYear = e.to !== "now" && e.to.slice(0, 4) === e.from.slice(0, 4);
    const period = `${e.from.replace("-", ".")} – ${e.to === "now" ? "지금" : sameYear ? e.to.slice(5) : e.to.replace("-", ".")}`;
    if (e.row === 0 && e.labelBelow) {
      parts.push(c.rich(x2 - 4, y + h + 24, [[e.label, { weight: 800, fill: t.ink }], [`  ${period}`, { weight: 500, fill: t.faint }]], { size: 15, anchor: "end" }));
    } else if (e.row === 0) {
      const anchor = e.current ? "end" : "start";
      const lx = e.current ? x2 - 4 : x1;
      parts.push(c.text(lx, y - 32, e.label, { size: 20, weight: 800, fill: e.current ? t.accent : t.ink, anchor }));
      parts.push(c.text(lx, y - 10, period, { size: 15, weight: 500, fill: t.faint, anchor }));
    } else {
      parts.push(c.rich(x1, y + 36, [[e.label, { weight: 700, fill: t.sub }], [`  ${period}`, { weight: 500, fill: t.faint }]], { size: 15 }));
    }
  }
  return c.render(parts.join("\n"));
}

// 7. 기술 스택: 바깥 아이콘 서비스 없이 simple-icons(CC0) 모양을 코코아 한 색으로
export async function stack(t, profile) {
  const icons = await import("simple-icons");
  const rows = profile.stack;
  const rowH = 124, H = rows.length * rowH + 8;
  const c = new Canvas({ width: W, height: H, title: "기술 스택", desc: rows.map((r) => `${r.group}: ${r.items.map(([name]) => name).join(", ")}`).join(" / ") });
  const parts = [];
  const left = 188, tile = 112, gap = 15;
  rows.forEach((r, ri) => {
    const y = ri * rowH;
    parts.push(c.text(4, y + 64, r.group, { size: 20, weight: 800, fill: t.ink }));
    r.items.forEach(([name, key], i) => {
      const x = left + i * (tile + gap);
      parts.push(`<rect x="${x}" y="${y}" width="${tile}" height="${rowH - 16}" rx="18" fill="${t.surface}"/>`);
      const icon = key && icons[key];
      if (icon) parts.push(`<g transform="translate(${x + tile / 2 - 16} ${y + 20}) scale(1.333)"><path d="${icon.path}" fill="${t.heat[4]}"/></g>`);
      else parts.push(c.text(x + tile / 2, y + 46, name === "AWS" ? "AWS" : "PW", { size: 22, weight: 800, fill: t.heat[4], anchor: "middle" }));
      parts.push(c.text(x + tile / 2, y + 86, name, { size: 15, weight: 700, fill: t.sub, anchor: "middle" }));
    });
  });
  return c.render(parts.join("\n"));
}
