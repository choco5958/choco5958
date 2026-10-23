// assets/*-{light,dark}.svg 를 다시 그리고, README.source.md 의 <!--n:키-->값<!--/n--> 자리에 숫자를 채워
// 한글 어절을 묶은 README.md 를 만든다. README 는 README.source.md 에서 고친다.
// 숫자는 scripts/data/*.json 에서만 온다. `--check` 는 파일을 쓰지 않고 어긋난 것만 알린다(CI 용).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { THEMES, fmt } from "./lib/design.mjs";
import * as assets from "./lib/assets.mjs";
import { joinWords } from "./lib/wordjoin.mjs";

const root = new URL("..", import.meta.url).pathname;
const check = process.argv.includes("--check");
const load = (name) => JSON.parse(readFileSync(`${root}scripts/data/${name}.json`, "utf8"));
const profile = load("profile");
const company = load("company");

const outputs = new Map();
for (const [name, make] of Object.entries(assets)) {
  for (const [theme, tokens] of Object.entries(THEMES)) {
    outputs.set(`assets/${name}-${theme}.svg`, await make(tokens, profile, company));
  }
}

const areaTotal = Object.values(company.areas).reduce((a, b) => a + b, 0);
const md = (s) => s.slice(5).replace("-", ".");
const numbers = {
  commits: fmt(company.commits),
  activeDays: company.activeDays,
  repos: company.repos,
  period: `${company.firstDay.replaceAll("-", ".")} ~ ${md(company.lastDay)}`,
  peak: `${md(company.peak.day)} · ${company.peak.commits}건`,
  cards: fmt(Object.values(company.cards).reduce((a, b) => a + b, 0)),
  feat: company.cards.FEAT,
  bug: company.cards.BUG,
  ops: company.cards.OPS,
  adr: company.cards.ADR,
  generatedAt: company.generatedAt,
  ...Object.fromEntries(Object.entries(company.areas).map(([k, v]) => [`area_${k}`, fmt(v)])),
  ...Object.fromEntries(Object.entries(company.areas).map(([k, v]) => [`pct_${k}`, `${Math.round((v / areaTotal) * 100)}%`])),
};
const readme = readFileSync(`${root}README.source.md`, "utf8");
const missing = [];
const filled = readme.replace(/<!--n:(\w+)-->(.*?)<!--\/n-->/g, (_, key) => {
  if (!(key in numbers)) missing.push(key);
  return `<!--n:${key}-->${numbers[key]}<!--/n-->`;
});
if (missing.length) {
  console.error(`README 에 모르는 숫자 키: ${missing.join(", ")}`);
  process.exit(1);
}
outputs.set("README.md", `<!-- 이 파일은 npm run build 가 README.source.md 에서 만든다. 직접 고치지 않는다 -->\n${joinWords(filled)}`);

if (check) {
  const stale = [...outputs].filter(([path, body]) => !existsSync(`${root}${path}`) || readFileSync(`${root}${path}`, "utf8") !== body).map(([path]) => path);
  if (stale.length) {
    console.error(`자료와 다른 파일이 있습니다. npm run build 후 커밋하세요:\n  ${stale.join("\n  ")}`);
    process.exit(1);
  }
  console.log(`그림 ${outputs.size - 1}장과 README 숫자가 자료와 같습니다.`);
} else {
  mkdirSync(`${root}assets`, { recursive: true });
  for (const [path, body] of outputs) {
    writeFileSync(`${root}${path}`, body);
    if (path.endsWith(".svg")) console.log(`${path}  ${(body.length / 1024).toFixed(1)}KB`);
  }
  console.log("README 숫자 채움");
}
