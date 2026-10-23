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
    // 바 색이 밝으면(다크 테마) 짙은 글자, 어두우면(라이트 테마) 흰 글자
    const barInk = isLight(t.heat[3]) ? "#161C1A" : "#FFFFFF";
    parts.push(c.text(cx, sy + 40, name, { size: 21, weight: 800, fill: barInk, anchor: "middle" }));
    parts.push(c.text(cx, sy + sh - 22, m.serviceSub, { size: 15, weight: 700, fill: barInk, anchor: "middle" }));
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
    const barInk = isLight(t.heat[3]) ? "#161C1A" : "#FFFFFF";
    parts.push(c.text(bx + bw / 2, by + 44, name, { size: 29, weight: 800, fill: barInk, anchor: "middle" }));
    parts.push(c.text(bx + bw / 2, by + 94, m.serviceSub, { size: 18, weight: 700, fill: barInk, anchor: "middle" }));
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

// 경력 연표(휴대폰): 최근 것이 위로 오는 세로 노선
export async function timelineMobile(t, profile) {
  const jobs = profile.career.filter((e) => e.row === 0).reverse();
  const study = profile.career.filter((e) => e.row === 1).reverse();
  const period = (e) => `${e.from.replace("-", ".")} – ${e.to === "now" ? "지금" : e.to.replace("-", ".")}`;
  const rowH = 96, studyH = 72, top = 48;
  const H = top + jobs.length * rowH + 40 + study.length * studyH + 36;
  const c = new Canvas({ width: M, height: H, title: "경력 연표", desc: profile.career.map((e) => `${e.label} ${period(e)}`).join(", ") });
  const parts = [`<rect width="${M}" height="${H}" rx="28" fill="${t.surface}"/>`];
  const rx = 64;
  parts.push(`<rect x="${rx - 3}" y="${top + 10}" width="6" height="${(jobs.length - 1) * rowH}" rx="3" fill="${t.heat[2]}"/>`);
  jobs.forEach((e, i) => {
    const y = top + i * rowH;
    parts.push(`<circle cx="${rx}" cy="${y + 12}" r="${e.current ? 15 : 11}" fill="${e.current ? t.accent : t.surface}" stroke="${e.current ? t.accent : t.heat[3]}" stroke-width="5"/>`);
    parts.push(c.text(rx + 36, y + 22, e.label, { size: 32, weight: 800, fill: e.current ? t.accent : t.ink }));
    parts.push(c.text(rx + 36, y + 58, period(e), { size: 22, weight: 500, fill: t.faint }));
  });
  let y = top + jobs.length * rowH + 20;
  parts.push(`<rect x="40" y="${y}" width="${M - 80}" height="3" rx="1.5" fill="${t.surface2}"/>`);
  y += 44;
  study.forEach((e, i) => {
    const yy = y + i * studyH;
    parts.push(c.text(rx + 36, yy, e.label, { size: 24, weight: 700, fill: t.sub }));
    parts.push(c.text(rx + 36, yy + 30, period(e), { size: 20, weight: 500, fill: t.faint }));
    parts.push(`<rect x="${rx - 8}" y="${yy - 18}" width="16" height="16" rx="4" fill="${t.heat[1]}"/>`);
  });
  return c.render(parts.join("\n"));
}

// 기술 스택(휴대폰): 한 줄에 네 칸
export async function stackMobile(t, profile) {
  const icons = await import("simple-icons");
  const perRow = 4, gap = 12, x0 = 32, tile = (M - x0 * 2 - gap * (perRow - 1)) / perRow, th = 116;
  let y = 8;
  const parts = [];
  const c = new Canvas({ width: M, height: 10, title: "", desc: "" });
  for (const r of profile.stack) {
    parts.push(c.text(x0, y + 34, r.group, { size: 28, weight: 800, fill: t.ink }));
    y += 56;
    r.items.forEach(([name, key], i) => {
      const x = x0 + (i % perRow) * (tile + gap), yy = y + Math.floor(i / perRow) * (th + gap);
      parts.push(`<rect x="${x.toFixed(1)}" y="${yy}" width="${tile.toFixed(1)}" height="${th}" rx="18" fill="${t.surface}"/>`);
      const icon = key && icons[key];
      if (icon) parts.push(`<g transform="translate(${(x + tile / 2 - 20).toFixed(1)} ${yy + 18}) scale(1.667)"><path d="${icon.path}" fill="${t.heat[4]}"/></g>`);
      else parts.push(c.text(x + tile / 2, yy + 50, name === "AWS" ? "AWS" : "PW", { size: 28, weight: 900, fill: t.heat[4], anchor: "middle" }));
      parts.push(c.text(x + tile / 2, yy + 94, name, { size: name.length > 9 ? 17 : 20, weight: 700, fill: t.sub, anchor: "middle" }));
    });
    y += Math.ceil(r.items.length / perRow) * (th + gap) + 20;
  }
  const H = y;
  const canvas = new Canvas({ width: M, height: H, title: "기술 스택", desc: profile.stack.map((r) => `${r.group}: ${r.items.map(([n]) => n).join(", ")}`).join(" / ") });
  canvas.used = c.used;
  return canvas.render(parts.join("\n"));
}

// 배지: 라이트·다크 어디서나 같은 보드 색이라 한 장씩만 만든다. { 파일 이름: SVG }
export async function badges(t, profile) {
  const out = {};
  const pill = async (label, { fill, ink, mark, h = 44, size = 18 }) => {
    const w = Math.round(textWidth(label, size) + 56);
    const c = new Canvas({ width: w, height: h, title: label, desc: label });
    const parts = [`<rect width="${w}" height="${h}" rx="${h / 2}" fill="${fill}"/>`];
    parts.push(`<rect x="18" y="${h / 2 - 5}" width="10" height="10" rx="3" fill="${mark}"/>`);
    parts.push(c.text(38, h / 2 + size * 0.36, label, { size, weight: 700, fill: ink }));
    return c.render(parts.join(""));
  };
  for (const [key, label] of Object.entries(profile.nav)) out[`nav-${key}`] = await pill(label, { fill: "#1F2725", ink: "#E3E2DA", mark: "#9FC7B8" });
  out["status-live"] = await pill("운영 중", { fill: "#9FC7B8", ink: "#161C1A", mark: "#161C1A", h: 32, size: 15 });
  out["status-dev"] = await pill("개발 중", { fill: "#28322F", ink: "#E3E2DA", mark: "#9AA09A", h: 32, size: 15 });
  return out;
}

// 섹션 보드 7종(요약·지금 하는 일·일하는 방식·경력·개인 제품·학력·연락). 내용은 scripts/data/sections.json
// { "sec-now": svg, "sec-now-mobile": svg, … } 를 테마마다 돌려준다.
export async function sections(t, profile, company, themeName) {
  const { readFileSync } = await import("node:fs");
  const { renderBoard, plain } = await import("./board.mjs");
  const raw = readFileSync(new URL("../data/sections.json", import.meta.url), "utf8");
  const total = Object.values(company.areas).reduce((a, b) => a + b, 0);
  const n = {
    commits: fmt(company.commits), repos: company.repos, cards: fmt(Object.values(company.cards).reduce((a, b) => a + b, 0)),
    feat: company.cards.FEAT, bug: company.cards.BUG, ops: company.cards.OPS, adr: company.cards.ADR,
  };
  const data = JSON.parse(raw.replace(/\{(\w+)\}/g, (m, k) => (k in n ? String(n[k]) : m)));
  for (const row of data.now) for (const tile of row) if (tile.share) tile.share = { commits: fmt(company.areas[tile.share]), pct: Math.round((company.areas[tile.share] / total) * 100) };
  // 대체 텍스트: 타일의 글을 그대로 이어 붙인다(화면 낭독기·검색용)
  const alt = (rows) => rows.flatMap((r) => (Array.isArray(r) ? r : [{ title: r.steps.map((s) => s[0]).join(" → ") }])).map((tile) =>
    [tile.title, tile.meta, tile.big && `${tile.big}${tile.unit || ""}`, tile.label, tile.text, ...(tile.bullets || []), ...(tile.stats || []).map((s) => s.join(" ")), tile.foot, tile.status && (tile.status === "live" ? "운영 중" : "개발 중")]
      .filter(Boolean).map((s) => plain(String(s))).join(". ")).join(" / ");
  const c = data.contact;
  const sets = {
    summary: data.summary,
    now: data.now,
    how: [{ steps: data.how.steps }, ...data.how.rows],
    career: data.career,
    products: data.products,
    education: data.education,
    contact: [[{ fill: "accent", title: c.title, text: c.text, big: c.mail }]],
  };
  const out = {};
  for (const [key, rows] of Object.entries(sets)) {
    const desc = alt(rows);
    out[`sec-${key}`] = await renderBoard(themeName, t, rows, { title: key, desc });
    out[`sec-${key}-mobile`] = await renderBoard(themeName, t, rows, { mobile: true, title: key, desc });
  }
  out.alt = Object.fromEntries(Object.entries(sets).map(([k, rows]) => [k, alt(rows)]));
  return out;
}
