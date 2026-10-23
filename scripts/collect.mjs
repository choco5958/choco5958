// 회사 저장소에서 본인 커밋을 세어 scripts/data/company.json 에 날짜·영역별 합계만 남긴다.
// 저장소 경로·이름은 공개하지 않는다: 목록은 커밋하지 않는 sources.local.json 에만 둔다.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";

const root = new URL("..", import.meta.url).pathname;
const configPath = `${root}scripts/data/sources.local.json`;
if (!existsSync(configPath)) {
  console.error("scripts/data/sources.local.json 이 없습니다. 회사 저장소 경로와 영역을 적어 주세요.");
  process.exit(1);
}
const config = JSON.parse(readFileSync(configPath, "utf8"));
const authors = new Set(config.authors.map((a) => a.toLowerCase()));

// 인프라·배포 작업은 저장소와 상관없이 커밋 제목의 범위로 가른다.
const INFRA = /^(ops|ci)\b|^\w+\((infra|ci|ops|pipeline|partners-[\w-]+|template|scripts|stacks?|modules?|core-ci|tf|terraform|backup|alarms?|waf|ecs|aurora)[^)]*\)/i;

const seen = new Map();
for (const repo of config.repos) {
  const dir = repo.path.replace(/^~/, homedir());
  const out = execFileSync(
    "git",
    ["-C", dir, "log", "--all", "--no-merges", `--since=${config.since}`, "--format=%H%x09%ae%x09%ad%x09%s", "--date=format-local:%Y-%m-%d"],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, env: { ...process.env, TZ: "Asia/Seoul" } },
  );
  for (const line of out.split("\n")) {
    if (!line) continue;
    const [hash, email, day, subject] = line.split("\t");
    if (!authors.has(email.toLowerCase()) || seen.has(hash)) continue;
    const area = INFRA.test(subject) ? "infra" : repo.area;
    const type = (subject.match(/^(feat|fix|docs|test|chore|ci|perf|refactor|release|style|ops)\b/) || [])[1] || "other";
    const cards = {};
    for (const kind of ["FEAT", "BUG", "OPS", "ADR"]) {
      const ids = subject.match(new RegExp(`\\b${kind}-\\d+`, "g")) || [];
      cards[kind] = ids.map((id) => `${dir}:${id}`);
    }
    seen.set(hash, { day, area, type, cards });
  }
}

const commits = [...seen.values()];
const daily = {};
const areas = {};
const types = {};
const cards = { FEAT: new Set(), BUG: new Set(), OPS: new Set(), ADR: new Set() };
for (const c of commits) {
  daily[c.day] = (daily[c.day] || 0) + 1;
  areas[c.area] = (areas[c.area] || 0) + 1;
  types[c.type] = (types[c.type] || 0) + 1;
  for (const kind of Object.keys(cards)) for (const id of c.cards[kind]) cards[kind].add(id);
}
const days = Object.keys(daily).sort();
const peakDay = days.reduce((a, b) => (daily[b] > daily[a] ? b : a), days[0]);

const result = {
  generatedAt: new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" }),
  firstDay: days[0],
  lastDay: days.at(-1),
  repos: config.repos.length,
  commits: commits.length,
  activeDays: days.length,
  peak: { day: peakDay, commits: daily[peakDay] },
  areas,
  types,
  cards: Object.fromEntries(Object.entries(cards).map(([k, v]) => [k, v.size])),
  daily: Object.fromEntries(days.map((d) => [d, daily[d]])),
};
writeFileSync(`${root}scripts/data/company.json`, JSON.stringify(result, null, 2) + "\n");
console.log(`커밋 ${result.commits}건 · 활동일 ${result.activeDays}일 · ${result.firstDay} ~ ${result.lastDay}`);
console.log("영역", areas, "카드", result.cards);
