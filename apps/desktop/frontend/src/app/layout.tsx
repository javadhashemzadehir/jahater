import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppRoot } from "@/components/shell/app-root";
import { fontVariables } from "@/lib/fonts";
import { DEFAULT_LOCALE, localeDirections } from "@/lib/i18n/config";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jahater",
};

// Server and static export render the default locale. LocaleHydrator switches
// to the saved locale on mount, so an English user sees one frame of fa.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang={DEFAULT_LOCALE}
      dir={localeDirections[DEFAULT_LOCALE]}
      className={fontVariables}
      suppressHydrationWarning
    >
      <body>
        <AppRoot>{children}</AppRoot>
      </body>
    </html>
  );
}
