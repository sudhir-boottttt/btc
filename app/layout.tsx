import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Satoshi Signal — BTC Journal & Risk Workspace",
  description: "A personal Bitcoin research, journaling, and risk-review workspace."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
