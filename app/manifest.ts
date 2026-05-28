import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "한나 운영 대시보드",
    short_name: "한나 운영",
    description: "한나의 일정, 할 일, 광고/공구, 입금 대기를 보는 운영 대시보드",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#F4F2EC",
    theme_color: "#6F8062",
    icons: [
      {
        src: "/icons/coolhanna-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/coolhanna-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/coolhanna-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "운영 대시보드",
        short_name: "운영",
        url: "/dashboard",
        icons: [{ src: "/icons/coolhanna-icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
