import type { MetadataRoute } from "next";

/** 인증·결제 화면은 네트워크에서만 제공한다. 설치형 창도 동일한 웹 서비스를 연다. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "사이로 | 사무소 업무 관리",
    short_name: "사이로",
    description: "매물·고객·방문 조율·계약을 한곳에서 관리합니다.",
    start_url: "/home",
    scope: "/",
    display: "standalone",
    background_color: "#f8f9fe",
    theme_color: "#3335a6",
    icons: [
      { src: "/brand/sairo-app-icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
      { src: "/brand/sairo-app-icon-512.svg", sizes: "512x512", type: "image/svg+xml" },
    ],
  };
}
