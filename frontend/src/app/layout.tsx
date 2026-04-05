import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Paper Trail AI",
  description: "Advanced Academic Research Agent and Knowledge Base",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="dark" suppressHydrationWarning>
      <body 
        className={`${inter.className} antialiased bg-[#050505] text-gray-200 overflow-hidden`} 
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
