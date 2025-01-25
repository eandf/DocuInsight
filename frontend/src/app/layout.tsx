import type { Metadata } from "next";
import "./globals.css";
import { onest } from "./fonts";

export const metadata: Metadata = {
  title: "DocuInsight",
  description: "DocuInsight's Main Website",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${onest.className} antialiased`}>{children}</body>
    </html>
  );
}
