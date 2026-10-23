// 첫 화면 인트로: 글자는 1초 안에 자리를 잡고 멈춘다. 움직임은 초콜릿 틀에 주별 커밋이 부어지는 것 하나.
// 한 번만 재생하고 마지막 프레임에 멈추므로, 마지막 프레임이 곧 정적인 첫 화면이다.
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import company from "../../scripts/data/company.json";
import profile from "../../scripts/data/profile.json";
import { weeks, level, isLight, fmt } from "../../scripts/lib/data.mjs";

const FIELD = { bg: "#2E1B12", ink: "#F6ECE4", sub: "#C9B3A5", mint: "#6FE3C1", mold: "#1E110A", heat: ["#4A2C1D", "#6B3F27", "#8E5634", "#B87344", "#E3A06A"] };
const SANS = "'LP Sans', sans-serif";
const out = { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) };

// 글자 한 줄: 아래에서 살짝 올라오며 나타난다
const Line = ({ at, x, y, size, weight, fill, spacing = 0, anchor = "start", children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <text
      x={x}
      y={y}
      fontFamily={SANS}
      fontSize={size}
      fontWeight={weight}
      fill={fill}
      letterSpacing={spacing}
      textAnchor={anchor}
      style={{
        opacity: interpolate(frame, [at * fps, at * fps + 0.4 * fps], [0, 1], out),
        translate: interpolate(frame, [at * fps, at * fps + 0.5 * fps], ["0px 14px", "0px 0px"], out),
      }}
    >
      {children}
    </text>
  );
};

// 틀의 한 칸: 바닥부터 초콜릿이 차오르고, 숫자가 0 에서 그 주의 커밋 수까지 올라간다
const Cell = ({ week, max, at, x, y, w, h, labelSize, numberSize }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fill = FIELD.heat[level(week.commits, max)];
  const ink = isLight(fill) ? FIELD.mold : FIELD.ink;
  const pour = interpolate(frame, [at * fps, at * fps + 0.55 * fps], [0, 1], out);
  const inner = h - 4;
  const count = Math.round(week.commits * pour);
  return (
    <g>
      <clipPath id={`cell-${x}-${y}`}>
        <rect x={x} y={y} width={w} height={inner} rx={12} />
      </clipPath>
      <rect x={x} y={y} width={w} height={inner} rx={12} fill="#000" opacity={0.25} />
      <g clipPath={`url(#cell-${x}-${y})`}>
        <rect x={x} y={y + 4} width={w} height={inner} rx={12} fill="#000" opacity={0.35 * pour} />
        <rect x={x} y={y + inner * (1 - pour)} width={w} height={inner * pour} fill={fill} />
      </g>
      <rect x={x + 8} y={y + 6} width={w - 16} height={5} rx={2.5} fill="#FFF" opacity={(isLight(fill) ? 0.4 : 0.14) * pour} />
      <text x={x + 14 - (labelSize > 16 ? 2 : 0)} y={y + (labelSize > 16 ? 32 : 34)} fontFamily={SANS} fontSize={labelSize} fontWeight={700} fill={pour > 0.5 ? ink : FIELD.sub} opacity={0.8}>
        {`${week.start.getUTCMonth() + 1}.${week.start.getUTCDate()}`}
      </text>
      <text x={x + 14 - (labelSize > 16 ? 2 : 0)} y={y + (labelSize > 16 ? 72 : 70)} fontFamily={SANS} fontSize={numberSize} fontWeight={800} fill={pour > 0.5 ? ink : FIELD.sub} opacity={interpolate(pour, [0, 0.15], [0, 1], { extrapolateRight: "clamp" })}>
        {fmt(count)}
      </text>
    </g>
  );
};

// 이번 주 칸: 다 부어진 뒤 민트 테두리가 그려진다
const Outline = ({ at, x, y, w, h }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const perimeter = 2 * (w + h);
  return (
    <rect
      x={x + 1.5}
      y={y + 1.5}
      width={w - 3}
      height={h - 7}
      rx={11}
      fill="none"
      stroke={FIELD.mint}
      strokeWidth={3}
      strokeDasharray={perimeter}
      strokeDashoffset={interpolate(frame, [at * fps, at * fps + 0.4 * fps], [perimeter, 0], out)}
    />
  );
};

export const Hero = ({ page, mobile }) => {
  const list = weeks(company).slice(-12);
  const max = Math.max(...list.map((w) => w.commits));
  const W = mobile ? 600 : 1200;
  // 칸 배치: 정적 그림과 같은 수치
  const g = mobile
    ? { cols: 4, gap: 10, pad: 16, bx: 40, by: 400, cw: (520 - 32 - 30) / 4, ch: 92, labelSize: 20, numberSize: 32 }
    : { cols: 4, gap: 10, pad: 16, bx: 1200 - 56 - (4 * 92 + 30 + 32), by: 44, cw: 92, ch: 88, labelSize: 14, numberSize: 28 };
  const bw = g.cols * g.cw + (g.cols - 1) * g.gap + g.pad * 2;
  const bh = 3 * g.ch + 2 * g.gap + g.pad * 2;
  const H = mobile ? g.by + bh + 70 : 450;
  const pourStart = 0.5, pourStep = 0.13;
  const lastAt = pourStart + (list.length - 1) * pourStep;

  return (
    <AbsoluteFill style={{ backgroundColor: page }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <rect width={W} height={H} rx={mobile ? 28 : 24} fill={FIELD.bg} />
        {mobile ? (
          <>
            <Line at={0} x={40} y={138} size={104} weight={800} fill={FIELD.ink} spacing={-3}>{profile.name}</Line>
            <Line at={0.12} x={44} y={194} size={30} weight={700} fill={FIELD.mint}>{profile.roleLine}</Line>
            {profile.taglineMobile.map((line, i) => (
              <Line key={line} at={0.2 + i * 0.08} x={44} y={262 + i * 44} size={32} weight={700} fill={i === 2 ? FIELD.sub : FIELD.ink} spacing={-0.5}>{line}</Line>
            ))}
          </>
        ) : (
          <>
            <Line at={0} x={64} y={168} size={112} weight={800} fill={FIELD.ink} spacing={-3}>{profile.name}</Line>
            <Line at={0.12} x={68} y={222} size={24} weight={700} fill={FIELD.mint}>{profile.roleLine}</Line>
            {profile.tagline.map((line, i) => (
              <Line key={line} at={0.2 + i * 0.08} x={68} y={296 + i * 42} size={29} weight={700} fill={i ? FIELD.sub : FIELD.ink} spacing={-0.4}>{line}</Line>
            ))}
            <Line at={0.36} x={68} y={408} size={19} weight={500} fill={FIELD.sub}>{profile.contact}</Line>
          </>
        )}
        {!mobile && <rect x={g.bx} y={g.by + 8} width={bw} height={bh} rx={20} fill="#000" opacity={0.28} />}
        <rect x={g.bx} y={g.by} width={bw} height={bh} rx={mobile ? 22 : 20} fill={FIELD.mold} />
        {list.map((week, i) => {
          const x = g.bx + g.pad + (i % g.cols) * (g.cw + g.gap);
          const y = g.by + g.pad + Math.floor(i / g.cols) * (g.ch + g.gap);
          return <Cell key={i} week={week} max={max} at={pourStart + i * pourStep} x={x} y={y} w={g.cw} h={g.ch} labelSize={g.labelSize} numberSize={g.numberSize} />;
        })}
        {list.map((week, i) => {
          if (!week.partial) return null;
          const x = g.bx + g.pad + (i % g.cols) * (g.cw + g.gap);
          const y = g.by + g.pad + Math.floor(i / g.cols) * (g.ch + g.gap);
          return <Outline key={`o${i}`} at={lastAt + 0.45} x={x} y={y} w={g.cw} h={g.ch} />;
        })}
        {mobile ? (
          <Line at={lastAt + 0.5} x={40} y={g.by + bh + 46} size={24} weight={500} fill={FIELD.sub}>{`${list.length}주, 한 칸이 한 주의 커밋`}</Line>
        ) : (
          <Line at={lastAt + 0.5} x={g.bx + bw} y={g.by + bh + 50} size={17} weight={500} fill={FIELD.sub} anchor="end">
            {`아이엔지스토리 ${list.length}주, 한 칸이 한 주의 커밋 · `}
            <tspan fill={FIELD.mint} fontWeight={700}>민트 테두리</tspan>
            {"는 이번 주"}
          </Line>
        )}
      </svg>
    </AbsoluteFill>
  );
};

// 길이와 크기: 마지막 칸이 차고 테두리·설명까지 나온 뒤 0.4초 머문다
export const heroTiming = (fps) => Math.ceil((0.5 + 11 * 0.13 + 0.5 + 0.5 + 0.4) * fps);
export const heroSize = (mobile) => (mobile ? { width: 600, height: 400 + (3 * 92 + 20 + 32) + 70 } : { width: 1200, height: 450 });
