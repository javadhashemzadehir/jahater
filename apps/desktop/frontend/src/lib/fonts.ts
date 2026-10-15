import localFont from "next/font/local";

// OFL-licensed variable font from the Jahater brand pack, bundled locally (no remote fonts in v0.x).
// Bricolage Grotesque covers Latin only. Persian text uses the system UI font until a Persian
// font is chosen and bundled. Vazirmatn and Yekan Bakh are not used.
const bricolageLatin = localFont({
  src: "../fonts/bricolage-grotesque-latin-variable.woff2",
  variable: "--font-bricolage",
  display: "swap",
  weight: "200 800",
});

export const fontVariables = bricolageLatin.variable;
