// GitHub README 는 CSS 를 못 넣어 word-break:keep-all 을 쓸 수 없다. 그래서 한글이 낀 글자 사이마다
// WORD JOINER(U+2060, 보이지 않음)를 넣어 어절 안에서 줄이 꺾이지 않게 한다. 띄어쓰기에서만 꺾인다.
// 코드 블록·인라인 코드·HTML 태그·주석·링크 주소는 건드리지 않는다.
export function joinWords(md) {
  const WJ = "\u2060";
  const out = [];
  let fence = false;
  for (const line of md.split("\n")) {
    if (/^```/.test(line)) { fence = !fence; out.push(line); continue; }
    if (fence) { out.push(line); continue; }
    // 제목 줄은 GitHub 가 앵커 주소를 만드는 자리라 건드리지 않는다(목차 링크가 깨질 수 있다)
    if (/^#{1,6}\s/.test(line)) { out.push(line); continue; }
    // 건드리면 안 되는 조각을 먼저 떼어 낸다
    const parts = line.split(/(`[^`]*`|<!--.*?-->|<[^>]+>|\]\([^)]*\)|https?:\/\/\S+)/);
    out.push(parts.map((p, i) => (i % 2 ? p : p.replace(/(?<=[^\s\u2060])(?=[^\s\u2060])/gu, (m, off, s) => {
      const a = s[off - 1], b = s[off];
      return /[가-힣]/.test(a) || /[가-힣]/.test(b) ? WJ : "";
    }))).join(""));
  }
  return out.join("\n");
}
