import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Daggadex ClubOS",
    short_name: "ClubOS",
    description: "Private club — live menu and order pipeline",
    start_url: "/",
    display: "standalone",
    background_color: "#26311F",
    theme_color: "#26311F",
    icons: [
      { src: "/icon-192", sizes: "192x192", type: "image/png" },
      { src: "/icon-512", sizes: "512x512", type: "image/png" },
    ],
  };
}
