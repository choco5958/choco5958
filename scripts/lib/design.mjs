// 프로필 그림 공통: 색 토큰(라이트/다크), 글꼴 내장, SVG 조각 도우미.
// 이미지로 보이는 SVG 는 바깥 글꼴을 못 불러오므로, 그림마다 쓴 글자만 잘라 woff2 로 넣는다.
import { readFileSync } from "node:fs";
import subsetFont from "subset-font";

const nm = new URL("../../node_modules/", import.meta.url).pathname;

// 녹흑 + 뼈색(Taste 추첨 「Green-black and bone」에서 고름). 라이트는 뼈색 표면, 다크는 녹흑 표면.
// 글자 대비는 모두 4.5:1 이상. field 는 두 테마 모두 짙은 녹흑 판(첫 화면 보드·구조도의 코어).
const FIELD = { bg: "#161C1A", ink: "#E3E2DA", sub: "#A9AEA7", mint: "#9FC7B8", mold: "#0F1412", heat: ["#28322F", "#33443E", "#4F6F63", "#76A294", "#9FC7B8"] };
export const THEMES = {
  light: {
    surface: "#ECEBE5",
    surface2: "#DFDED6",
    ink: "#161C1A",
    sub: "#46504C",
    faint: "#545D59",
    accent: "#2F6F5E",
    // 커밋이 많을수록 짙은 녹색
    heat: ["#E3E2DA", "#B9CFC6", "#7FAE9E", "#357763", "#1F5446"],
    field: FIELD,
  },
  dark: {
    surface: "#1F2725",
    surface2: "#28322F",
    ink: "#E3E2DA",
    sub: "#B4B8B1",
    faint: "#9AA09A",
    accent: "#9FC7B8",
    heat: ["#28322F", "#33443E", "#4F6F63", "#76A294", "#9FC7B8"],
    field: FIELD,
  },
};

const FONT_FILES = {
  sans: {
    500: "pretendard/dist/public/static/alternative/Pretendard-Medium.ttf",
    700: "pretendard/dist/public/static/alternative/Pretendard-Bold.ttf",
    800: "pretendard/dist/public/static/alternative/Pretendard-ExtraBold.ttf",
    900: "pretendard/dist/public/static/alternative/Pretendard-Black.ttf",
  },
  mono: {
    700: "@fontsource/jetbrains-mono/files/jetbrains-mono-latin-700-normal.woff2",
    800: "@fontsource/jetbrains-mono/files/jetbrains-mono-latin-800-normal.woff2",
  },
};

export const SANS = "'LP Sans', Pretendard, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif";
export const MONO = "'LP Mono', 'JetBrains Mono', ui-monospace, Menlo, monospace";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export { esc };

// 그림 하나에 쓰는 글자 모음. text()/mono() 가 여기에 글자를 쌓고, 마지막에 글꼴을 자른다.
export class Canvas {
  constructor({ width, height, title, desc }) {
    Object.assign(this, { width, height, title, desc });
    this.used = { sans: { 500: "", 700: "", 800: "", 900: "" }, mono: { 700: "", 800: "" } };
  }

  // 글자 조각. weight 500/700/800, anchor start/middle/end
  text(x, y, content, { size = 16, weight = 500, fill, anchor = "start", family = "sans", spacing, cls, extra = "" } = {}) {
    this.used[family][weight] += content;
    const ls = spacing === undefined ? "" : ` letter-spacing="${spacing}"`;
    return `<text x="${x}" y="${y}" font-family="${family === "mono" ? MONO : SANS}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}"${ls}${cls ? ` class="${cls}"` : ""}${extra}>${esc(content)}</text>`;
  }

  // 한 줄 안에서 굵기·색이 바뀌는 글자: parts = [[글자, { weight, fill, family }], …]
  rich(x, y, parts, { size = 16, anchor = "start" } = {}) {
    const spans = parts
      .map(([content, o = {}]) => {
        const family = o.family || "sans";
        const weight = o.weight || (family === "mono" ? 700 : 500);
        this.used[family][weight] += content;
        return `<tspan font-family="${family === "mono" ? MONO : SANS}" font-weight="${weight}" fill="${o.fill}">${esc(content)}</tspan>`;
      })
      .join("");
    return `<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}">${spans}</text>`;
  }

  mono(x, y, content, opts = {}) {
    return this.text(x, y, content, { weight: 700, ...opts, family: "mono" });
  }

  async fontFaces() {
    const faces = [];
    for (const [family, weights] of Object.entries(this.used)) {
      for (const [weight, chars] of Object.entries(weights)) {
        if (!chars) continue;
        const source = readFileSync(nm + FONT_FILES[family][weight]);
        const unique = [...new Set(chars + " ")].join("");
        const subset = await subsetFont(source, unique, { targetFormat: "woff2" });
        const name = family === "mono" ? "LP Mono" : "LP Sans";
        faces.push(`@font-face{font-family:'${name}';font-weight:${weight};src:url(data:font/woff2;base64,${subset.toString("base64")}) format('woff2');}`);
      }
    }
    return faces.join("");
  }

  async render(body, { css = "", bg } = {}) {
    const faces = await this.fontFaces();
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${this.width}" height="${this.height}" viewBox="0 0 ${this.width} ${this.height}" role="img" aria-labelledby="t d">
<title id="t">${esc(this.title)}</title>
<desc id="d">${esc(this.desc)}</desc>
<style>${faces}${css}@media (prefers-reduced-motion: reduce){*{animation:none!important;}}</style>
${bg ? `<rect width="${this.width}" height="${this.height}" rx="20" fill="${bg}"/>` : ""}
${body}
</svg>
`;
  }
}

export const fmt = (n) => n.toLocaleString("en-US");
