import localFont from "next/font/local";

// OFL-licensed fonts, bundled locally (no remote fonts in v0.x).
// Yekan Bakh is not used: its licence does not allow redistribution in this repo.
const vazirmatnArabic = localFont({
  src: "../fonts/vazirmatn-arabic-400-normal.woff2",
  variable: "--font-vazirmatn-arabic",
  display: "swap",
  weight: "400",
});

const vazirmatnLatin = localFont({
  src: "../fonts/vazirmatn-latin-400-normal.woff2",
  variable: "--font-vazirmatn-latin",
  display: "swap",
  weight: "400",
});

const comfortaaLatin = localFont({
  src: "../fonts/comfortaa-latin-400-normal.woff2",
  variable: "--font-comfortaa",
  display: "swap",
  weight: "400",
});

export const fontVariables = [
  vazirmatnArabic.variable,
  vazirmatnLatin.variable,
  comfortaaLatin.variable,
].join(" ");
