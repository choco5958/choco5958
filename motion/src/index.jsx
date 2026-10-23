import { Composition, continueRender, delayRender, registerRoot, staticFile } from "remotion";
import { Hero, heroSize, heroTiming } from "./Hero.jsx";

// Pretendard 를 다 읽은 뒤에 프레임을 찍는다(글꼴이 늦게 붙으면 첫 프레임 글자 폭이 달라진다)
const fontsReady = delayRender("Pretendard");
Promise.all(
  [["500", "Pretendard-Medium.ttf"], ["700", "Pretendard-Bold.ttf"], ["800", "Pretendard-ExtraBold.ttf"]].map(([weight, file]) =>
    new FontFace("LP Sans", `url(${staticFile(file)})`, { weight }).load().then((face) => document.fonts.add(face)),
  ),
).then(() => continueRender(fontsReady));

const FPS = 30;
// 둥근 모서리 바깥은 GitHub 바탕색으로 채운다(GIF 는 반투명을 못 쓴다)
const PAGES = { light: "#ffffff", dark: "#0d1117" };

const Root = () => (
  <>
    {[false, true].flatMap((mobile) =>
      Object.entries(PAGES).map(([theme, page]) => (
        <Composition
          key={`${mobile}-${theme}`}
          id={`Hero${mobile ? "Mobile" : ""}${theme === "dark" ? "Dark" : "Light"}`}
          component={Hero}
          fps={FPS}
          durationInFrames={heroTiming(FPS)}
          {...heroSize(mobile)}
          defaultProps={{ page, mobile }}
        />
      )),
    )}
  </>
);

registerRoot(Root);
