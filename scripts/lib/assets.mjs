// 프로필 그림. 각 함수는 (테마 색, 프로필, 회사 자료) 를 받아 SVG 문자열을 돌려준다.
// 장식(고정폭 캡션·번호·가는 테두리·깜빡임) 없이, 채운 면과 큰 글자와 실제 숫자로만 짓는다.
import { Canvas } from "./design.mjs";
import { day, iso, addDays, mondayOf, weeks, level, isLight, fmt } from "./data.mjs";

const W = 1200;

const mmdd = (d) => `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`;

const textWidth = (label, size) =>
  [...label].reduce((w, ch) => w + (/[가-힣]/.test(ch) ? size * 0.92 : ch === " " ? size * 0.26 : /[0-9]/.test(ch) ? size * 0.6 : size * 0.55), 0);

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
  parts.push(c.rich(40, 90, [[`${company.activeDays}일 동안 커밋했습니다. `, { weight: 700, fill: t.ink }], ["막대", { weight: 700, fill: t.heat[3] }], ["는 하루, ", { fill: t.sub }], ["민트 선", { weight: 700, fill: t.accent }], ["은 누적입니다.", { fill: t.sub }]], { size: 17 }));

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

// ── 휴대폰 전용 세로 그림 ─────────────────────────────────────────────
// README 폭이 360px 안팎이면 1200px 그림의 글자가 5px 까지 줄어든다. 600px 폭으로 따로 그려
// 화면에서 본문이 16px 안팎이 되게 한다(README 의 <picture> 가 max-width: 600px 일 때 고른다).
const M = 600;

export async function moldMobile(t, profile) {
  const m = profile.mold;
  const f = t.field;
  const x0 = 32, w0 = M - 64;
  const parts = [];
  // 틀: 제목 + 일곱 칸(4·3줄)
  const chipH = 62, chipGap = 10, perRow = 4;
  const rows = Math.ceil(m.core.parts.length / perRow);
  const coreH = 150 + rows * (chipH + chipGap);
  parts.push(`<rect x="${x0}" y="32" width="${w0}" height="${coreH}" rx="22" fill="${f.bg}"/>`);
  const c = new Canvas({ width: M, height: 10, title: "", desc: "" });
  parts.push(c.text(x0 + 28, 92, m.core.title, { size: 36, weight: 800, fill: f.ink }));
  parts.push(c.text(x0 + 28, 134, m.core.note, { size: 24, weight: 700, fill: f.mint }));
  const chipW = (w0 - 56 - chipGap * (perRow - 1)) / perRow;
  m.core.parts.forEach((name, i) => {
    const cx = x0 + 28 + (i % perRow) * (chipW + chipGap), cy = 160 + Math.floor(i / perRow) * (chipH + chipGap);
    parts.push(`<rect x="${cx.toFixed(1)}" y="${cy}" width="${chipW.toFixed(1)}" height="${chipH}" rx="12" fill="${f.mold}"/>`);
    parts.push(c.text(cx + chipW / 2, cy + 40, name, { size: name.length > 5 ? 19 : 23, weight: 700, fill: f.ink, anchor: "middle" }));
  });
  // 줄기와 2×3 바
  let y = 32 + coreH;
  parts.push(`<rect x="${M / 2 - 5}" y="${y}" width="10" height="34" rx="5" fill="${t.heat[2]}" opacity="0.7"/>`);
  y += 34;
  const bw = (w0 - 16) / 2, bh = 112;
  m.services.forEach((name, i) => {
    const bx = x0 + (i % 2) * (bw + 16), by = y + Math.floor(i / 2) * (bh + 16);
    parts.push(`<rect x="${bx.toFixed(1)}" y="${by + 6}" width="${bw.toFixed(1)}" height="${bh}" rx="16" fill="${t.heat[4]}" opacity="0.35"/>`);
    parts.push(`<rect x="${bx.toFixed(1)}" y="${by}" width="${bw.toFixed(1)}" height="${bh}" rx="16" fill="${t.heat[3]}"/>`);
    parts.push(`<rect x="${(bx + 14).toFixed(1)}" y="${by + 58}" width="${(bw - 28).toFixed(1)}" height="5" rx="2.5" fill="${t.heat[4]}" opacity="0.45"/>`);
    parts.push(c.text(bx + bw / 2, by + 44, name, { size: 29, weight: 800, fill: "#FFF7F0", anchor: "middle" }));
    parts.push(c.text(bx + bw / 2, by + 94, m.serviceSub, { size: 18, weight: 700, fill: "#FFE9D8", anchor: "middle" }));
  });
  y += 3 * (bh + 16) + 8;
  // 받침
  const baseH = 64 + m.base.lines.length * 36;
  parts.push(`<rect x="${x0}" y="${y}" width="${w0}" height="${baseH}" rx="22" fill="${t.surface2}"/>`);
  parts.push(c.text(x0 + 28, y + 50, m.base.title, { size: 30, weight: 800, fill: t.ink }));
  m.base.lines.forEach((line, i) => parts.push(c.text(x0 + 28, y + 92 + i * 34, line, { size: 22, weight: 500, fill: t.sub })));
  const H = y + baseH + 32;
  const canvas = new Canvas({ width: M, height: H, title: "한 틀로 찍어내는 서비스", desc: `${m.core.title}(${m.core.parts.join(", ")})에서 ${m.services.join(", ")} 서비스를 찍어내고, ${m.base.title}(${m.base.lines.join(" · ")}) 위에서 운영합니다.` });
  canvas.used = c.used;
  return canvas.render([`<rect width="${M}" height="${H}" rx="28" fill="${t.surface}"/>`, ...parts].join("\n"));
}

export async function metricsMobile(t, profile) {
  const rows = profile.metrics;
  const show = (v, r) => (r.unit === "분" ? v.toFixed(1) : String(v)) + r.unit;
  const rowH = 196, top = 24, H = top * 2 + rows.length * rowH - 16;
  const c = new Canvas({ width: M, height: H, title: "전후 실측", desc: rows.map((r) => `${r.label}(${r.where}) ${show(r.before, r)} → ${r.afterText || show(r.after, r)}`).join(" / ") });
  const parts = [`<rect width="${M}" height="${H}" rx="28" fill="${t.surface}"/>`];
  const x0 = 36, bw = M - 72 - 120;
  rows.forEach((r, i) => {
    const y = top + i * rowH;
    if (i) parts.push(`<rect x="${x0}" y="${y - 8}" width="${M - 72}" height="3" rx="1.5" fill="${t.surface2}"/>`);
    parts.push(c.text(x0, y + 46, r.label, { size: 32, weight: 800, fill: t.ink }));
    const delta = r.higherIsBetter ? `+${r.after - r.before}${r.unit}` : `−${Math.round((1 - r.after / r.before) * 100)}%`;
    parts.push(c.text(M - x0, y + 48, delta, { size: 40, weight: 800, fill: t.accent, anchor: "end" }));
    parts.push(c.text(x0, y + 82, r.where, { size: 20, weight: 500, fill: t.faint }));
    const scale = Math.max(r.before, r.after);
    const w1 = Math.max(8, (r.before / scale) * bw), w2 = Math.max(8, (r.after / scale) * bw);
    parts.push(`<rect x="${x0}" y="${y + 104}" width="${w1.toFixed(1)}" height="24" rx="7" fill="${t.heat[1]}"/>`);
    parts.push(c.text(x0 + w1 + 12, y + 124, show(r.before, r), { size: 22, weight: 700, fill: t.sub }));
    parts.push(`<rect x="${x0}" y="${y + 138}" width="${w2.toFixed(1)}" height="24" rx="7" fill="${t.heat[4]}"/>`);
    parts.push(c.text(x0 + w2 + 12, y + 158, r.afterText || show(r.after, r), { size: 22, weight: 800, fill: t.ink }));
  });
  return c.render(parts.join("\n"));
}
