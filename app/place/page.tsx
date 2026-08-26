import type { Metadata } from "next";
import PlaceDetailView, { type PlaceDetailData } from "@/components/PlaceDetailView";
import "./place-detail.css";
import "./place-detail-mockup.css";

export const metadata: Metadata = {
  title: "장소 상세 | 오늘어디",
  description: "오늘어디 장소 정보와 위치를 확인하세요.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function value(params: Record<string, string | string[] | undefined>, key: string) {
  const target = params[key];
  return Array.isArray(target) ? target[0] ?? "" : target ?? "";
}

export default async function PlacePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const openingState = value(params, "openingState");
  const place: PlaceDetailData = {
    id: value(params, "id"),
    name: value(params, "name") || "장소 정보",
    category: value(params, "category") || "장소",
    address: value(params, "address"),
    latitude: value(params, "latitude"),
    longitude: value(params, "longitude"),
    imageUrl: value(params, "imageUrl"),
    imageAttribution: value(params, "imageAttribution"),
    imageCopyrightCode: value(params, "imageCopyrightCode"),
    imageModificationAllowed: value(params, "imageModificationAllowed") === "1",
    openingHoursText: value(params, "openingHoursText"),
    openingState: openingState === "open" || openingState === "closed" ? openingState : "unknown",
    phone: value(params, "phone"),
  };

  return <PlaceDetailView place={place} />;
}
