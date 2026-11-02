import type { MetadataRoute } from "next";
import { getMessages } from "@/i18n";

export default function manifest(): MetadataRoute.Manifest {
  const m = getMessages();
  return {
    name: m.app.title,
    short_name: m.app.shortName,
    description: m.app.description,
    lang: "ja",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#060c1c",
    theme_color: "#060c1c",
    categories: ["sports", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
