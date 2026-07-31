export type PublicCoursePlace = {
  address: string;
  category: string;
  id: string;
  name: string;
};

export type PublicCourseSnapshot = {
  places: PublicCoursePlace[];
  source: "한국관광공사 TourAPI";
};

export type SharedCourse = {
  createdAt: string;
  duration: string;
  expiresAt: string;
  region: string;
  snapshot: PublicCourseSnapshot;
  title: string;
};

export type OwnedCourseShare = {
  createdAt: string;
  duration: string;
  expiresAt: string;
  id: string;
  region: string;
  revokedAt?: string | null;
  title: string;
};

export type CreatedCourseShare = OwnedCourseShare & {
  url: string;
};

export function naverPlaceSearchUrl(place: PublicCoursePlace) {
  return `https://map.naver.com/p/search/${encodeURIComponent(`${place.name} ${place.address}`.trim())}`;
}
