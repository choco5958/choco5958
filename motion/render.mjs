// 첫 화면 보드 GIF 네 장을 assets/ 에 만든다. `node render.mjs --stills` 는 확인용 정지 장면만 뽑는다.
// 크롬 경로가 다르면 CHROME 환경 변수로 알려 준다.
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { heroIntroFingerprint, HERO_INTRO_MANIFEST } from "../scripts/lib/fingerprint.mjs";

const here = new URL(".", import.meta.url).pathname;
const fonts = new URL("../node_modules/pretendard/dist/public/static/alternative/", import.meta.url).pathname;
mkdirSync(`${here}public`, { recursive: true });
for (const f of ["Pretendard-Medium.ttf", "Pretendard-Bold.ttf", "Pretendard-ExtraBold.ttf", "Pretendard-Black.ttf"]) copyFileSync(fonts + f, `${here}public/${f}`);

const browser = process.env.CHROME ? [`--browser-executable=${process.env.CHROME}`] : [];
const remotion = (args) => execFileSync(`${here}node_modules/.bin/remotion`, [...args, ...browser, "--log=error"], { cwd: here, stdio: "inherit" });

const ids = { BoardLight: "hero-intro-light", BoardDark: "hero-intro-dark", BoardMobileLight: "hero-intro-mobile-light", BoardMobileDark: "hero-intro-mobile-dark" };

if (process.argv.includes("--stills")) {
  mkdirSync(`${here}out`, { recursive: true });
  for (const id of ["BoardDark", "BoardMobileLight"]) {
    for (const frame of [8, 40, "last"]) {
      remotion(["still", "src/index.jsx", id, `out/${id}-${frame}.png`, `--frame=${frame === "last" ? -1 : frame}`]);
    }
  }
} else {
  // Remotion 기본 GIF 는 프레임마다 색표를 새로 뽑아 크기가 들쭉날쭉하다(같은 장면이 0.5MB와 3MB).
  // PNG 프레임을 뽑은 뒤, 함께 들어 있는 ffmpeg 로 전체 공통 색표를 만들고 바뀐 영역만 저장한다.
  const bin = `${here}node_modules/@remotion/compositor-darwin-arm64/`;
  const ffmpeg = (args) => execFileSync(`${bin}ffmpeg`, ["-v", "error", "-y", ...args], { env: { ...process.env, DYLD_LIBRARY_PATH: bin }, stdio: "inherit" });
  for (const [id, name] of Object.entries(ids)) {
    const frames = `${here}out/frames-${id}`;
    rmSync(frames, { recursive: true, force: true });
    // 15fps 로 충분히 부드럽고 프레임은 절반
    remotion(["render", "src/index.jsx", id, frames, "--sequence", "--image-format=png", "--every-nth-frame=2", "--concurrency=2"]);
    const list = readdirSync(frames).filter((f) => f.endsWith(".png")).sort();
    const pattern = list[0].replace(/\d+(?=\.png$)/, (d) => `%0${d.length}d`);
    const file = `${here}../assets/${name}.gif`;
    ffmpeg(["-framerate", "15", "-start_number", list[0].match(/(\d+)\.png$/)[1], "-i", `${frames}/${pattern}`, "-vf", "palettegen=stats_mode=diff:max_colors=128", `${frames}/palette.png`]);
    // -loop -1: 한 번만 재생하고 마지막 장면에 멈춘다
    ffmpeg(["-framerate", "15", "-start_number", list[0].match(/(\d+)\.png$/)[1], "-i", `${frames}/${pattern}`, "-i", `${frames}/palette.png`, "-lavfi", "paletteuse=dither=none:diff_mode=rectangle", "-loop", "-1", file]);
    console.log(`assets/${name}.gif  ${(statSync(file).size / 1024).toFixed(0)}KB`);
  }
  writeFileSync(`${here}../${HERO_INTRO_MANIFEST}`, JSON.stringify({ fingerprint: heroIntroFingerprint() }, null, 2) + "\n");
  console.log(`${HERO_INTRO_MANIFEST} 갱신`);
}
