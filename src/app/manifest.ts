import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Домашний диспетчер еды",
    short_name: "Меню дома",
    description: "Семейный планировщик еды, остатков, запасов и покупок.",
    start_url: "/",
    display: "standalone",
    background_color: "#FAF7EF",
    theme_color: "#4F7C5D",
    orientation: "portrait-primary",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" }
    ],
  };
}
