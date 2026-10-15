import localFont from "next/font/local";

// Owner-supplied fonts, bundled locally (no remote fonts in v0.x).
// Comfortaa (SIL OFL, variable) covers Latin. Yekan Bakh FaNum covers Persian with Persian digits.
// Comfortaa has no Persian glyphs, so the stack falls through to Yekan Bakh per character.
const comfortaa = localFont({
  src: "../fonts/comfortaa-variable.ttf",
  variable: "--font-comfortaa",
  display: "swap",
  weight: "300 700",
});

const yekanBakh = localFont({
  src: [
    { path: "../fonts/yekan-bakh-fanum-regular.woff", weight: "400", style: "normal" },
    { path: "../fonts/yekan-bakh-fanum-medium.woff", weight: "500", style: "normal" },
    { path: "../fonts/yekan-bakh-fanum-bold.woff", weight: "700", style: "normal" },
  ],
  variable: "--font-yekan",
  display: "swap",
});

export const fontVariables = `${comfortaa.variable} ${yekanBakh.variable}`;
