"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AppIcon from "@/components/AppIcon";
import { naverMapSearchUrl } from "@/utils/naver-maps";
import {
  PlaceLibraryLoginRequiredError,
  toggleSavedPlace,
} from "@/utils/place-library";

export interface PlaceDetailData {
  id: string;
  name: string;
  category: string;
  address: string;
  latitude: string;
  longitude: string;
  imageUrl: string;
  imageAttribution: string;
  imageCopyrightCode: string;
  imageModificationAllowed: boolean;
  openingHoursText: string;
  openingState: "open" | "closed" | "unknown";
  phone: string;
}

function DetailFallback() {
  return (
    <div className="kp-detail-image-fallback" aria-hidden="true">
      <span>오늘어디</span>
      <strong>장소 사진 준비 중</strong>
    </div>
  );
}

export default function PlaceDetailView({ place }: { place: PlaceDetailData }) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const hasLicensedImage = Boolean(
    place.imageUrl &&
      place.imageAttribution &&
      (place.imageCopyrightCode === "Type1" || place.imageCopyrightCode === "Type3") &&
      !imageFailed
  );

  const libraryPlace = {
    id: place.id,
    name: place.name,
    region: place.address.split(/\s+/)[0] || "전국",
    city: place.address.split(/\s+/)[1] || null,
    category: place.category,
    address: place.address || null,
    latitude: Number(place.latitude),
    longitude: Number(place.longitude),
    imageUrl: place.imageUrl || null,
    source: "TOUR_API",
  };

  const savePlace = async () => {
    try {
      setSaved(await toggleSavedPlace(libraryPlace));
    } catch (error) {
      if (error instanceof PlaceLibraryLoginRequiredError) {
        if (window.confirm("장소를 저장하려면 로그인이 필요합니다. 로그인 화면으로 이동할까요?")) {
          router.push("/login");
        }
        return;
      }
      window.alert(error instanceof Error ? error.message : "장소를 저장하지 못했습니다.");
    }
  };

  const sharePlace = async () => {
    const shareData = { title: place.name, text: `${place.name}\n${place.address}`, url: window.location.href };
    if (navigator.share) {
      await navigator.share(shareData);
      return;
    }
    await navigator.clipboard.writeText(window.location.href);
    window.alert("장소 링크를 복사했습니다.");
  };

  return (
    <main className="kp-place-detail-page">
      <header className="kp-detail-topbar">
        <Link href="/explore" aria-label="장소 찾기로 돌아가기"><AppIcon name="back" size={24} /></Link>
        <strong>장소 상세</strong>
        <button type="button" onClick={() => void sharePlace()} aria-label="장소 공유"><AppIcon name="share" size={21} /></button>
      </header>

      <section className="kp-detail-hero">
        <DetailFallback />
        {hasLicensedImage && (
          <>
            {/* TourAPI image hosts vary; only verified licensed URLs are rendered. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className={place.imageModificationAllowed ? "" : "is-no-derivatives"}
              src={place.imageUrl}
              alt={`${place.name} 대표 사진`}
              onError={() => setImageFailed(true)}
            />
            <small>{place.imageAttribution}</small>
          </>
        )}
      </section>

      <section className="kp-detail-summary">
        <div>
          <span>{place.category}</span>
          <h1>{place.name}</h1>
          {place.openingState === "open" && <b>● 현재 영업 중</b>}
          <p>● {place.address || "주소 정보가 없습니다."}</p>
        </div>
        <button className={saved ? "is-saved" : ""} type="button" onClick={() => void savePlace()} aria-pressed={saved}>
          {saved ? "♥" : "♡"}
        </button>
      </section>

      <nav className="kp-detail-tabs" aria-label="장소 상세 메뉴">
        <strong>정보</strong><span>영업시간</span><span>편의정보</span><span>사진</span>
      </nav>

      <section className="kp-detail-info-grid">
        <article><small>카테고리</small><strong>{place.category}</strong></article>
        <article><small>영업시간</small><strong>{place.openingHoursText || "공식 정보 확인 필요"}</strong></article>
        <article><small>전화</small><strong>{place.phone || "공공데이터 번호 없음"}</strong></article>
      </section>

      <section className="kp-detail-map-preview" aria-label="찾아가는 길 미리보기">
        <b>찾아가는 길</b><i className="road-one" /><i className="road-two" /><span>●</span>
      </section>

      <section className="kp-detail-actions">
        <a href={naverMapSearchUrl(place.name, place.address, place.latitude, place.longitude)} target="_blank" rel="noopener noreferrer"><AppIcon name="route" size={20} /><span>길찾기</span></a>
        {place.phone ? <a href={`tel:${place.phone.replace(/[^0-9+]/g, "")}`}><AppIcon name="phone" size={20} /><span>전화</span></a> : <a href={naverMapSearchUrl(place.name, place.address, place.latitude, place.longitude)} target="_blank" rel="noopener noreferrer"><AppIcon name="search" size={20} /><span>지도</span></a>}
        <button type="button" onClick={() => void savePlace()}><AppIcon name="bookmark" size={20} /><span>저장</span></button>
        <button type="button" onClick={() => void sharePlace()}><AppIcon name="share" size={20} /><span>공유</span></button>
      </section>
      <a className="kp-detail-primary-action" href={naverMapSearchUrl(place.name, place.address, place.latitude, place.longitude)} target="_blank" rel="noopener noreferrer">네이버 지도로 길찾기</a>
    </main>
  );
}
