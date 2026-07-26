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
