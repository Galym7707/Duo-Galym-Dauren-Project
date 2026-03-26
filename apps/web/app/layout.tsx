import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Saryna MRV",
  description: "Methane and flaring workflow demo for Kazakhstan Startup Challenge 2026.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
