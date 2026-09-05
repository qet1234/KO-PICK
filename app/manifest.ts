import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "오늘어디",
    short_name: "오늘어디",
    description: "전국 맛집, 카페, 여행지와 축제를 찾는 장소 추천 서비스",
    lang: "ko-KR",
    start_url: "/?source=home-screen",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f5f4ef",
    theme_color: "#146b45",
    categories: ["food", "travel", "lifestyle"],
    icons: [
      {
        src: "/app-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/app-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
