// 첫 화면 보드 GIF 네 장을 assets/ 에 만든다. `node render.mjs --stills` 는 확인용 정지 장면만 뽑는다.
// 크롬 경로가 다르면 CHROME 환경 변수로 알려 준다.
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, statSync, writeFileSync } from "node:fs";
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
  for (const [id, name] of Object.entries(ids)) {
    const file = `${here}../assets/${name}.gif`;
    // 15fps 로 충분히 부드럽고 크기는 절반. 0 = 한 번만 재생하고 마지막 장면에 멈춘다
    remotion(["render", "src/index.jsx", id, file, "--codec=gif", "--every-nth-frame=2", "--number-of-gif-loops=0", "--concurrency=2"]);
    console.log(`assets/${name}.gif  ${(statSync(file).size / 1024).toFixed(0)}KB`);
  }
  writeFileSync(`${here}../${HERO_INTRO_MANIFEST}`, JSON.stringify({ fingerprint: heroIntroFingerprint() }, null, 2) + "\n");
  console.log(`${HERO_INTRO_MANIFEST} 갱신`);
}
