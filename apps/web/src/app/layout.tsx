import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PDI+",
  description: "Transformando planos de desenvolvimento em jornadas.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className="bg-white text-neutral-900 antialiased">{children}</body>
    </html>
  );
}
