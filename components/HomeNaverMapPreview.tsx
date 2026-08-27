"use client";

import Link from "next/link";
import Script from "next/script";
import { useCallback, useEffect, useRef } from "react";
import {
  naverMapsApi,
  type NaverMapInstance,
  type NaverMarkerInstance,
} from "@/utils/naver-maps";

type MapCenter = {
  latitude: number;
  longitude: number;
  zoom: number;
};

const regionCenters: Record<string, MapCenter> = {
  전국: { latitude: 36.35, longitude: 127.8, zoom: 7 },
  서울: { latitude: 37.5665, longitude: 126.978, zoom: 12 },
  부산: { latitude: 35.1796, longitude: 129.0756, zoom: 12 },
  대구: { latitude: 35.8714, longitude: 128.6014, zoom: 12 },
  인천: { latitude: 37.4563, longitude: 126.7052, zoom: 11 },
  광주: { latitude: 35.1595, longitude: 126.8526, zoom: 12 },
  대전: { latitude: 36.3504, longitude: 127.3845, zoom: 12 },
  울산: { latitude: 35.5384, longitude: 129.3114, zoom: 11 },
  세종: { latitude: 36.48, longitude: 127.289, zoom: 12 },
  경기: { latitude: 37.275, longitude: 127.009, zoom: 10 },
  강원: { latitude: 37.8228, longitude: 128.1555, zoom: 9 },
  충북: { latitude: 36.6357, longitude: 127.4917, zoom: 10 },
  충남: { latitude: 36.6588, longitude: 126.6728, zoom: 10 },
  전북: { latitude: 35.8203, longitude: 127.1088, zoom: 10 },
  전남: { latitude: 34.8161, longitude: 126.463, zoom: 9 },
  경북: { latitude: 36.576, longitude: 128.5056, zoom: 9 },
  경남: { latitude: 35.2383, longitude: 128.6924, zoom: 9 },
  제주: { latitude: 33.4996, longitude: 126.5312, zoom: 10 },
};

const markerOffsets = [
  { latitude: 0, longitude: 0 },
  { latitude: 0.013, longitude: -0.019 },
  { latitude: -0.011, longitude: 0.018 },
  { latitude: 0.017, longitude: 0.021 },
  { latitude: -0.018, longitude: -0.014 },
] as const;

type HomeNaverMapPreviewProps = {
  href: string;
  locationLabel: string;
  region: string;
};

export default function HomeNaverMapPreview({
  href,
  locationLabel,
  region,
}: HomeNaverMapPreviewProps) {
  const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID?.trim();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<NaverMapInstance | null>(null);
  const markersRef = useRef<NaverMarkerInstance[]>([]);
  const center = regionCenters[region] ?? regionCenters.전국;

  const initializeMap = useCallback(() => {
    const maps = naverMapsApi();
    const container = containerRef.current;
    if (!maps || !container) return;

    const position = new maps.LatLng(center.latitude, center.longitude);
    if (!mapRef.current) {
      mapRef.current = new maps.Map(container, {
        center: position,
        zoom: center.zoom,
        mapTypeControl: false,
        mapDataControl: false,
        scaleControl: false,
        zoomControl: false,
      });
    } else {
      mapRef.current.setCenter(position);
      mapRef.current.setZoom(center.zoom);
    }

    markersRef.current.forEach((marker) => marker.setMap(null));
    const spread = region === "전국" ? 2.2 : regionCenters[region]?.zoom && regionCenters[region].zoom < 11 ? 0.35 : 1;
    markersRef.current = markerOffsets.map((offset, index) =>
      new maps.Marker({
        map: mapRef.current ?? undefined,
        position: new maps.LatLng(
          center.latitude + offset.latitude * spread,
          center.longitude + offset.longitude * spread
        ),
        title: `${locationLabel} 탐색 지점 ${index + 1}`,
        icon: {
          anchor: new maps.Point(13, 34),
          content: '<span class="kp-app-naver-pin" aria-hidden="true"><i></i></span>',
        },
      })
    );
  }, [center, locationLabel, region]);

  useEffect(() => {
    initializeMap();
  }, [initializeMap]);

  useEffect(
    () => () => {
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
    },
    []
  );

  return (
    <div className="kp-app-map-preview">
      {clientId ? (
        <>
          <div
            aria-hidden="true"
            className="kp-app-naver-map"
            ref={containerRef}
          />
          <Script
            id="naver-map-home-sdk"
            onReady={initializeMap}
            src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(clientId)}`}
            strategy="afterInteractive"
          />
        </>
      ) : (
        <div className="kp-app-map-unavailable" aria-hidden="true">
          <strong>네이버 지도</strong>
          <span>지도 연결 설정을 확인해 주세요.</span>
        </div>
      )}
      <Link
        aria-label={`${locationLabel} 장소를 네이버 지도에서 보기`}
        className="kp-app-map-cover-link"
        href={href}
      >
        <span>
          <strong>지금 여기, 인기 장소</strong>
          <small>{locationLabel} 네이버 지도에서 보기</small>
        </span>
        <b aria-hidden="true">↗</b>
      </Link>
    </div>
  );
}
