type ExternalBookingPlace = {
  name: string;
  address?: string | null;
  placeUrl?: string | null;
};

function bookingQuery(place: ExternalBookingPlace) {
  return [place.name, place.address, "예약"]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ");
}

export function naverBookingSearchUrl(place: ExternalBookingPlace) {
  return `https://search.naver.com/search.naver?query=${encodeURIComponent(bookingQuery(place))}`;
}

export function kakaoBookingSearchUrl(place: ExternalBookingPlace) {
  const exactPlaceUrl = place.placeUrl?.trim();
  if (exactPlaceUrl && /^https?:\/\/(?:place|map)\.map\.kakao\.com\//i.test(exactPlaceUrl)) {
    return exactPlaceUrl.replace(/^http:/i, "https:");
  }

  return `https://map.kakao.com/link/search/${encodeURIComponent(bookingQuery(place))}`;
}
