// 첫 화면 보드: 타일이 놓이고(0.5초), 3D 스카이라인 블록이 날짜 순서대로 솟아오르고, 숫자가 올라간다.
// 글자는 1초 안에 자리를 잡는다. 한 번만 재생하고 마지막 프레임에 멈추므로 마지막 프레임이 곧 정적인 첫 화면이다.
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import company from "../../scripts/data/company.json";
import profile from "../../scripts/data/profile.json";
import { weeks, level, fmt, day, addDays, iso, mondayOf } from "../../scripts/lib/data.mjs";

// 녹흑 + 뼈색
const T = { bg: "#161C1A", surface: "#1F2725", surface2: "#28322F", ink: "#E3E2DA", muted: "#A9AEA7", accent: "#9FC7B8", accentInk: "#161C1A" };
const RAMP = ["#28322F", "#33443E", "#4F6F63", "#76A294", "#9FC7B8"];
const TOP = "#DFF1EA";
const SANS = "'LP Sans', sans-serif";
const out = { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) };
const cards = Object.values(company.cards).reduce((a, b) => a + b, 0);
const mix = (hex, to, k) => {
  const a = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const b = [1, 3, 5].map((i) => parseInt(to.slice(i, i + 2), 16));
  return "#" + a.map((v, i) => Math.round(v + (b[i] - v) * k).toString(16).padStart(2, "0")).join("");
};

const useT = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return frame / fps;
};

const Text = ({ x, y, size, weight = 700, fill = T.ink, anchor = "start", spacing = 0, children }) => (
  <text x={x} y={y} fontFamily={SANS} fontSize={size} fontWeight={weight} fill={fill} textAnchor={anchor} letterSpacing={spacing}>
    {children}
  </text>
);

// 타일 하나: 순서대로 살짝 올라오며 놓인다
const Tile = ({ order, x, y, w, h, fill = T.surface, children }) => {
  const t = useT();
  const at = 0.04 * order;
  return (
    <g style={{ opacity: interpolate(t, [at, at + 0.3], [0, 1], out), translate: interpolate(t, [at, at + 0.45], ["0px 12px", "0px 0px"], out) }}>
      <rect x={x} y={y} width={w} height={h} rx={14} fill={fill} />
      {children}
    </g>
  );
};

// 0 에서 값까지 올라가는 숫자
const Count = ({ value, suffix = "", ...rest }) => {
  const t = useT();
  const k = interpolate(t, [0.3, 1.1], [0, 1], out);
  return <Text {...rest}>{fmt(Math.round(value * k)) + suffix}</Text>;
};

// 등각 스카이라인: 열 = 주, 행 = 요일, 높이 = 그날 커밋. 날짜 순서대로 솟아오른다
// cx 는 바닥 면의 가로 가운데, bottom 은 바닥 면의 맨 아래(타일 안에 가운데 오게)
const Skyline = ({ cx, bottom, s, zmax, label = 17 }) => {
  const t = useT();
  const start = mondayOf(day(company.firstDay));
  const nW = weeks(company).length;
  const ox = cx - ((nW - 7) / 2) * s * 0.866;
  const oy = bottom - (nW + 7) * s * 0.5;
  const total = nW * 7;
  const blocks = [];
  for (let i = 0; i < nW; i++) for (let j = 0; j < 7; j++) blocks.push({ i, j, d: iso(addDays(start, i * 7 + j)), n: i * 7 + j });
  blocks.sort((a, b) => a.i + a.j - (b.i + b.j));
  const p = (i, j, z) => [ox + (i - j) * s * 0.866, oy + (i + j) * s * 0.5 - z];
  const pts = (a) => a.map((q) => q.map((v) => v.toFixed(1)).join(",")).join(" ");
  let peak = null;
  const shapes = blocks.map((b) => {
    const v = company.daily[b.d] || 0;
    const rise = interpolate(t, [0.5 + (b.n / total) * 1.5, 0.5 + (b.n / total) * 1.5 + 0.4], [0, 1], out);
    const z = (v ? 5 + (v / company.peak.commits) * zmax : 1.5) * Math.max(rise, 0.02);
    const base = v ? RAMP[Math.max(1, level(v, company.peak.commits))] : mix(T.surface, "#000000", 0.2);
    const top = v && level(v, company.peak.commits) === 4 ? TOP : mix(base, "#ffffff", 0.12);
    const g = 0.1;
    const A = p(b.i + g, b.j + g, z), B = p(b.i + 1 - g, b.j + g, z), C = p(b.i + 1 - g, b.j + 1 - g, z), D = p(b.i + g, b.j + 1 - g, z);
    const C0 = p(b.i + 1 - g, b.j + 1 - g, 0), D0 = p(b.i + g, b.j + 1 - g, 0), B0 = p(b.i + 1 - g, b.j + g, 0);
    if (b.d === company.peak.day) peak = { at: p(b.i + 0.5, b.j + 0.5, z), rise };
    return (
      <g key={b.d}>
        <polygon points={pts([D, C, C0, D0])} fill={mix(base, "#0B100E", 0.3)} />
        <polygon points={pts([B, C, C0, B0])} fill={mix(base, "#0B100E", 0.5)} />
        <polygon points={pts([A, B, C, D])} fill={top} />
      </g>
    );
  });
  return (
    <g>
      {shapes}
      {peak && (
        <g style={{ opacity: interpolate(peak.rise, [0.8, 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
          <rect x={peak.at[0] - 1.5} y={peak.at[1] - 46} width={3} height={40} rx={1.5} fill={T.accent} />
          <text x={peak.at[0]} y={peak.at[1] - 56} fontFamily={SANS} fontSize={label} textAnchor="middle">
            <tspan fontWeight={800} fill={T.accent}>{`${company.peak.commits}건`}</tspan>
            <tspan fontWeight={700} fill={T.muted}>{"  10월 8일"}</tspan>
          </text>
        </g>
      )}
    </g>
  );
};

const Chip = ({ x, y, w, h, size, children }) => (
  <g>
    <rect x={x} y={y} width={w} height={h} rx={10} fill={T.surface2} />
    <Text x={x + 16} y={y + h / 2 + size * 0.36} size={size}>{children}</Text>
  </g>
);

// 데스크톱: 12열 판
const Desktop = () => {
  const W = 1200, g = 10, m = 12, cols = 12, cw = (W - m * 2 - g * (cols - 1)) / cols, rh = 86;
  const X = (c) => m + c * (cw + g), Wd = (n) => n * cw + (n - 1) * g, Y = (r) => m + r * (rh + g), Hd = (n) => n * rh + (n - 1) * g;
  return (
    <>
      <Tile order={0} x={X(0)} y={Y(0)} w={Wd(6)} h={Hd(4)}>
        <Text x={X(0) + 30} y={Y(0) + 186} size={150} weight={900} spacing={-6}>{profile.name}</Text>
        <Text x={X(0) + 34} y={Y(0) + 246} size={24} fill={T.accent}>{profile.roleLine}</Text>
        <Text x={X(0) + 34} y={Y(0) + 298} size={22} weight={500}>{profile.tagline[0]}</Text>
        <Text x={X(0) + 34} y={Y(0) + 330} size={22} weight={500} fill={T.muted}>{profile.tagline[1]}</Text>
      </Tile>
      <Tile order={1} x={X(6)} y={Y(0)} w={Wd(6)} h={Hd(5)} fill={T.surface2}>
        <Text x={X(6) + 26} y={Y(0) + 46} size={22} weight={800}>12주 동안 하루하루 쌓인 커밋</Text>
        <Text x={X(6) + 26} y={Y(0) + 76} size={17} weight={500} fill={T.muted}>하루 한 칸, 높을수록 커밋이 많은 날</Text>
        <Skyline cx={X(6) + Wd(6) / 2} bottom={Y(0) + Hd(5) - 28} s={26} zmax={160} />
      </Tile>
      <Tile order={2} x={X(0)} y={Y(4)} w={Wd(3)} h={Hd(1)}>
        <Count x={X(0) + 24} y={Y(4) + 56} size={40} weight={900} value={company.commits} />
        <Text x={X(0) + Wd(3) - 22} y={Y(4) + 54} size={17} fill={T.muted} anchor="end">회사 커밋</Text>
      </Tile>
      <Tile order={3} x={X(3)} y={Y(4)} w={Wd(3)} h={Hd(1)}>
        <Count x={X(3) + 24} y={Y(4) + 56} size={40} weight={900} value={company.activeDays} />
        <Text x={X(3) + Wd(3) - 22} y={Y(4) + 54} size={17} fill={T.muted} anchor="end">커밋한 날</Text>
      </Tile>
      <Tile order={4} x={X(0)} y={Y(5)} w={Wd(8)} h={Hd(2)}>
        <Text x={X(0) + 28} y={Y(5) + 50} size={24} weight={800}>{profile.mold.servicesTitle}</Text>
        {profile.mold.services.map((s, i) => (
          <Chip key={s} x={X(0) + 28 + (i % 3) * 252} y={Y(5) + 72 + Math.floor(i / 3) * 54} w={238} h={44} size={19}>{s}</Chip>
        ))}
      </Tile>
      <Tile order={5} x={X(8)} y={Y(5)} w={Wd(4)} h={Hd(2)}>
        <Text x={X(8) + 24} y={Y(5) + 48} size={22} weight={800}>배포 시간</Text>
        <Text x={X(8) + Wd(4) - 24} y={Y(5) + 50} size={32} weight={900} fill={T.accent} anchor="end">−41%</Text>
        <text x={X(8) + 24} y={Y(5) + 132} fontFamily={SANS} fontSize={48}>
          <tspan fontWeight={900} fill={T.muted}>16.0</tspan>
          <tspan fontWeight={700} fill={T.muted}>{" → "}</tspan>
          <tspan fontWeight={900} fill={T.ink}>9.4분</tspan>
        </text>
        <Text x={X(8) + 24} y={Y(5) + 164} size={16} weight={500} fill={T.muted}>같은 파이프라인 전후</Text>
      </Tile>
      <Tile order={6} x={X(0)} y={Y(7)} w={Wd(3)} h={Hd(2)}>
        <Count x={X(0) + 24} y={Y(7) + 86} size={60} weight={900} value={cards} />
        <Text x={X(0) + 26} y={Y(7) + 124} size={19} fill={T.muted}>작업 카드</Text>
      </Tile>
      <Tile order={7} x={X(3)} y={Y(7)} w={Wd(4)} h={Hd(2)}>
        <Text x={X(3) + 24} y={Y(7) + 50} size={22} weight={800}>공통 코어</Text>
        <Text x={X(3) + 24} y={Y(7) + 112} size={36} weight={900}>0.1.0 → 0.1.115</Text>
        <Text x={X(3) + 24} y={Y(7) + 148} size={17} fill={T.muted}>4주 · DB 이관 147개 · 7개 패키지</Text>
      </Tile>
      <Tile order={8} x={X(7)} y={Y(7)} w={Wd(5)} h={Hd(2)} fill={T.accent}>
        <Text x={X(7) + 30} y={Y(7) + 64} size={32} weight={900} fill={T.accentInk}>채용 · 협업 문의</Text>
        <Text x={X(7) + 30} y={Y(7) + 106} size={25} fill={T.accentInk}>{profile.contact}</Text>
        <Text x={X(7) + Wd(5) - 30} y={Y(7) + 152} size={40} weight={900} fill={T.accentInk} anchor="end">→</Text>
      </Tile>
    </>
  );
};

// 휴대폰: 같은 타일을 세로로 다시 쌓는다
const Mobile = () => {
  const W = 600, m = 14, g = 12, w = W - m * 2, half = (w - g) / 2;
  let y = m;
  const at = (h) => { const top = y; y += h + g; return top; };
  const yName = at(360), ySky = at(440), yNum = at(132), ySvc = at(330), yDep = at(190), yCard = at(200), yCta = at(170);
  return (
    <>
      <Tile order={0} x={m} y={yName} w={w} h={360}>
        <Text x={m + 30} y={yName + 150} size={128} weight={900} spacing={-5}>{profile.name}</Text>
        <Text x={m + 34} y={yName + 206} size={30} fill={T.accent}>{profile.roleLine}</Text>
        {profile.taglineMobile.map((l, i) => (
          <Text key={l} x={m + 34} y={yName + 262 + i * 38} size={27} weight={500} fill={i === 2 ? T.muted : T.ink}>{l}</Text>
        ))}
      </Tile>
      <Tile order={1} x={m} y={ySky} w={w} h={440} fill={T.surface2}>
        <Text x={m + 28} y={ySky + 52} size={28} weight={800}>12주 동안 쌓인 커밋</Text>
        <Text x={m + 28} y={ySky + 88} size={21} weight={500} fill={T.muted}>하루 한 칸, 높을수록 많은 날</Text>
        <Skyline cx={W / 2} bottom={ySky + 440 - 24} s={23} zmax={150} label={21} />
      </Tile>
      <Tile order={2} x={m} y={yNum} w={half} h={132}>
        <Count x={m + 24} y={yNum + 70} size={48} weight={900} value={company.commits} />
        <Text x={m + 26} y={yNum + 108} size={21} fill={T.muted}>회사 커밋</Text>
      </Tile>
      <Tile order={3} x={m + half + g} y={yNum} w={half} h={132}>
        <Count x={m + half + g + 24} y={yNum + 70} size={48} weight={900} value={company.activeDays} />
        <Text x={m + half + g + 26} y={yNum + 108} size={21} fill={T.muted}>커밋한 날</Text>
      </Tile>
      <Tile order={4} x={m} y={ySvc} w={w} h={330}>
        <Text x={m + 28} y={ySvc + 56} size={30} weight={800}>{profile.mold.servicesTitle}</Text>
        {profile.mold.services.map((s, i) => (
          <Chip key={s} x={m + 28 + (i % 2) * ((w - 56 - 12) / 2 + 12)} y={ySvc + 84 + Math.floor(i / 2) * 76} w={(w - 56 - 12) / 2} h={64} size={25}>{s}</Chip>
        ))}
      </Tile>
      <Tile order={5} x={m} y={yDep} w={w} h={190}>
        <Text x={m + 28} y={yDep + 54} size={28} weight={800}>배포 시간</Text>
        <Text x={W - m - 28} y={yDep + 56} size={40} weight={900} fill={T.accent} anchor="end">−41%</Text>
        <text x={m + 28} y={yDep + 140} fontFamily={SANS} fontSize={62}>
          <tspan fontWeight={900} fill={T.muted}>16.0</tspan>
          <tspan fontWeight={700} fill={T.muted}>{" → "}</tspan>
          <tspan fontWeight={900} fill={T.ink}>9.4분</tspan>
        </text>
      </Tile>
      <Tile order={6} x={m} y={yCard} w={half} h={200}>
        <Count x={m + 24} y={yCard + 100} size={64} weight={900} value={cards} />
        <Text x={m + 26} y={yCard + 148} size={22} fill={T.muted}>작업 카드</Text>
      </Tile>
      <Tile order={7} x={m + half + g} y={yCard} w={half} h={200}>
        <Text x={m + half + g + 24} y={yCard + 52} size={24} weight={800}>공통 코어</Text>
        <Text x={m + half + g + 24} y={yCard + 112} size={32} weight={900}>0.1.115</Text>
        <Text x={m + half + g + 24} y={yCard + 152} size={20} fill={T.muted}>4주 · 7개 패키지</Text>
      </Tile>
      <Tile order={8} x={m} y={yCta} w={w} h={170} fill={T.accent}>
        <Text x={m + 30} y={yCta + 70} size={36} weight={900} fill={T.accentInk}>채용 · 협업 문의</Text>
        <Text x={m + 30} y={yCta + 122} size={28} fill={T.accentInk}>{profile.contact}</Text>
      </Tile>
    </>
  );
};

export const Board = ({ page, mobile }) => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: page }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <rect width={width} height={height} rx={24} fill={T.bg} />
        {mobile ? <Mobile /> : <Desktop />}
      </svg>
    </AbsoluteFill>
  );
};

// 길이: 블록이 다 솟고(0.5 + 1.5 + 0.4초) 0.5초 머문다
export const boardTiming = (fps) => Math.ceil(2.9 * fps);
export const boardSize = (mobile) => (mobile ? { width: 600, height: 14 + (360 + 440 + 132 + 330 + 190 + 200 + 170) + 12 * 6 + 14 } : { width: 1200, height: 12 + 9 * 86 + 8 * 10 + 12 });
