import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PDI+",
    short_name: "PDI+",
    description: "Transformando Planos de Desenvolvimento em Jornadas.",
    start_url: "/",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#E8590C",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
