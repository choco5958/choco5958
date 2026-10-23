// 그림(SVG)과 움직이는 첫 화면(motion/)이 함께 쓰는 순수 계산. Node 전용 모듈을 들이지 않는다.

// 'YYYY-MM-DD' 를 UTC 정오 날짜로 (시간대에 흔들리지 않게)
export const day = (s) => new Date(`${s}T12:00:00Z`);
export const iso = (d) => d.toISOString().slice(0, 10);
export const addDays = (d, n) => new Date(d.getTime() + n * 86400000);
export const mondayOf = (d) => addDays(d, -((d.getUTCDay() + 6) % 7));

// 월요일로 시작하는 주마다 커밋 합계. 마지막 주가 아직 안 끝났으면 partial
export function weeks(company) {
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

// 0(없음)~4(가장 많음) 다섯 단계
export const level = (value, max) => (value === 0 ? 0 : Math.min(4, 1 + Math.floor((value / max) * 3.999)));

// 칸 색이 밝으면 짙은 글자, 어두우면 밝은 글자
export const isLight = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b > 150;
};

export const fmt = (n) => n.toLocaleString("en-US");
