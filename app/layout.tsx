import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Satoshi Signal — BTC Intelligence",
  description: "Probability-based Bitcoin market intelligence. Not investment advice."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
