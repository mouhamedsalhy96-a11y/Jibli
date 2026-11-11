import type { Metadata } from "next";
import { StoreProvider } from "@/components/store";
import { Shell } from "@/components/shell";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "Jibli — Vos envies, un devis en dinars", template: "%s | Jibli" },
  description: "Composez un panier depuis vos liens SHEIN et AliExpress, recevez un devis détaillé en TND et suivez votre demande. Prototype interactif.",
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fr" data-scroll-behavior="smooth"><body><StoreProvider><Shell>{children}</Shell></StoreProvider></body></html>;
}
