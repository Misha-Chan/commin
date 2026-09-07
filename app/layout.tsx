import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "بوت خدمات المجتمع",
  description: "لوحة إدارة بوت الخدمات المجتمعية على تيليجرام",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@600;700;800&family=Tajawal:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
