type ExternalBookingPlace = {
  name: string;
  address?: string | null;
  placeUrl?: string | null;
};

function cleanPlaceName(value: string) {
  return value
    .replace(/\[[^\]]*]/g, " ")
    .replace(/(?:주식회사|유한회사|\(주\)|㈜)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function bookingQuery(place: ExternalBookingPlace) {
  return [cleanPlaceName(place.name), place.address, "네이버 예약"]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ");
}

export function isNaverBookingCategory(category?: string | null) {
  return /(?:음식|맛집|restaurant|카페|cafe)/i.test(category || "");
}

export function naverBookingSearchUrl(place: ExternalBookingPlace) {
  return `https://search.naver.com/search.naver?query=${encodeURIComponent(bookingQuery(place))}`;
}
