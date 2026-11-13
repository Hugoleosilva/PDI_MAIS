import type { Metadata, Viewport } from "next";
import "./globals.css";
import { RegisterServiceWorker } from "@/components/RegisterServiceWorker";

export const metadata: Metadata = {
  title: "PDI+",
  description: "Transformando Planos de Desenvolvimento em Jornadas.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PDI+",
  },
};

export const viewport: Viewport = {
  themeColor: "#E8590C",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className="bg-white text-neutral-900 antialiased">
        <a href="#main-content" className="skip-link">
          Pular para o conteúdo
        </a>
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
