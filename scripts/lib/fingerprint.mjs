// 움직이는 첫 화면(GIF)이 어떤 자료로 렌더됐는지 남기는 지문. GIF 는 크롬이 있어야 다시 만들 수 있어
// CI 가 직접 렌더하지 못하므로, 자료가 바뀌었는데 GIF 를 다시 뽑지 않으면 빌드 검사가 알려 준다.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const root = new URL("../../", import.meta.url).pathname;
const read = (file) => readFileSync(root + file, "utf8");

// GIF 에 그려지는 것만 넣는다: 기술 스택 같은 다른 항목을 고쳐도 다시 렌더하라고 하지 않게
export const heroIntroFingerprint = () => {
  const company = JSON.parse(read("scripts/data/company.json"));
  const profile = JSON.parse(read("scripts/data/profile.json"));
  const drawn = {
    company: { firstDay: company.firstDay, lastDay: company.lastDay, commits: company.commits, daily: company.daily },
    profile: { name: profile.name, roleLine: profile.roleLine, tagline: profile.tagline, taglineMobile: profile.taglineMobile, contact: profile.contact, mold: profile.mold },
    cards: company.cards,
  };
  const hash = createHash("sha256").update(JSON.stringify(drawn));
  for (const file of ["motion/src/Board.jsx", "motion/src/index.jsx", "scripts/lib/data.mjs"]) hash.update(read(file));
  return hash.digest("hex").slice(0, 16);
};
export const HERO_INTRO_MANIFEST = "assets/hero-intro.json";
