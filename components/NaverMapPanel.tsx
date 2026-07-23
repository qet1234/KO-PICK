"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";

type MapItem = {
  id: string;
  name: string;
  category: string;
  address: string;
  telephone: string;
  mapUrl: string;
  mapx: string;
  mapy: string;
};

type NaverMapPanelProps = {
  clientId: string;
  region: string;
  items: MapItem[];
  mapAllUrl: string;
};

const REGION_CENTERS: Record<string, [number, number]> = {
  서울: [37.5666103, 126.9783882],
  부산: [35.1795543, 129.0756416],
  대구: [35.8714354, 128.601445],
  인천: [37.4562557, 126.7052062],
  광주: [35.1595454, 126.8526012],
  대전: [36.3504119, 127.3845475],
  울산: [35.5394773, 129.3112994],
  세종: [36.480132, 127.289021],
  경기: [37.2750605, 127.0093852],
  강원: [37.8853981, 127.7297738],
  충북: [36.6356963, 127.4913899],
  충남: [36.6588296, 126.6727764],
  전북: [35.820308, 127.108791],
  전남: [34.8160954, 126.4628842],
  경북: [36.575998, 128.505799],
  경남: [35.2382943, 128.692397],
  제주: [33.4996213, 126.5311884],
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export default function NaverMapPanel({
  clientId,
  region,
  items,
  mapAllUrl,
}: NaverMapPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<unknown>(null);
  const markersRef = useRef<unknown[]>([]);
  const [sdkReady, setSdkReady] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const initializeMap = useCallback(() => {
    const naver = (window as typeof window & { naver?: any }).naver;
    if (!containerRef.current || !naver?.maps) return;

    markersRef.current.forEach((marker: any) => marker.setMap(null));
    markersRef.current = [];

    const [latitude, longitude] = REGION_CENTERS[region] || REGION_CENTERS.서울;
    const map = new naver.maps.Map(containerRef.current, {
      center: new naver.maps.LatLng(latitude, longitude),
      zoom: region === "서울" ? 11 : 9,
      zoomControl: true,
      zoomControlOptions: {
        position: naver.maps.Position.TOP_RIGHT,
      },
      mapDataControl: false,
      scaleControl: false,
    });

    mapRef.current = map;
    const bounds = new naver.maps.LatLngBounds();
    const infoWindow = new naver.maps.InfoWindow({
      borderWidth: 0,
      backgroundColor: "transparent",
      disableAnchor: true,
      pixelOffset: new naver.maps.Point(0, -12),
    });

    let markerCount = 0;

    items.forEach((item, index) => {
      const mapx = Number(item.mapx);
      const mapy = Number(item.mapy);
      if (!Number.isFinite(mapx) || !Number.isFinite(mapy)) return;

      const position = naver.maps.TransCoord.fromTM128ToLatLng(
        new naver.maps.Point(mapx, mapy)
      );
      const marker = new naver.maps.Marker({
        position,
        map,
        title: item.name,
        icon: {
          content: `<button type="button" class="kp-naver-map-marker" aria-label="${escapeHtml(item.name)}"><span>${index + 1}</span></button>`,
          anchor: new naver.maps.Point(18, 42),
        },
      });

      naver.maps.Event.addListener(marker, "click", () => {
        infoWindow.setContent(
          `<div class="kp-naver-map-info"><small>${escapeHtml(item.category)}</small><strong>${escapeHtml(item.name)}</strong><p>${escapeHtml(item.address)}</p><a href="${item.mapUrl}" target="_blank" rel="noreferrer">네이버 지도에서 보기 ↗</a></div>`
        );
        infoWindow.open(map, marker);
      });

      bounds.extend(position);
      markersRef.current.push(marker);
      markerCount += 1;
    });

    if (markerCount > 1) {
      map.fitBounds(bounds, { top: 70, right: 60, bottom: 70, left: 60 });
    } else if (markerCount === 1) {
      map.setCenter(bounds.getCenter());
      map.setZoom(15);
    }
  }, [items, region]);

  useEffect(() => {
    if (sdkReady) initializeMap();
  }, [initializeMap, sdkReady]);

  useEffect(() => {
    const target = window as typeof window & { navermap_authFailure?: () => void };
    target.navermap_authFailure = () => setLoadError(true);
    return () => {
      delete target.navermap_authFailure;
    };
  }, []);

  if (!clientId) {
    return (
      <div className="kp-naver-map-shell is-setup">
        <div className="kp-naver-map-setup">
          <strong>네이버 지도 연결 준비가 필요합니다.</strong>
          <p>Vercel에 NAVER_MAP_CLIENT_ID를 등록하면 이 영역에 지도가 표시됩니다.</p>
          <a href={mapAllUrl} target="_blank" rel="noreferrer">
            네이버 지도에서 먼저 보기 ↗
          </a>
        </div>
      </div>
    );
  }

  const scriptUrl = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(clientId)}&submodules=geocoder`;

  return (
    <div className="kp-naver-map-shell">
      <Script
        id="naver-maps-sdk"
        src={scriptUrl}
        strategy="afterInteractive"
        onReady={() => {
          setLoadError(false);
          setSdkReady(true);
        }}
        onError={() => setLoadError(true)}
      />
      <div ref={containerRef} className="kp-naver-map" aria-label={`${region} 네이버 지도`} />
      {!sdkReady && !loadError && (
        <div className="kp-naver-map-overlay">네이버 지도를 불러오는 중입니다.</div>
      )}
      {loadError && (
        <div className="kp-naver-map-overlay is-error">
          <strong>네이버 지도 인증 정보를 확인해 주세요.</strong>
          <a href={mapAllUrl} target="_blank" rel="noreferrer">
            네이버 지도에서 직접 보기 ↗
          </a>
        </div>
      )}
    </div>
  );
}
