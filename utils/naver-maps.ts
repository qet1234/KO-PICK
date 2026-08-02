export type NaverLatLng = object;

export interface NaverLatLngBounds {
  extend(position: NaverLatLng): void;
  getCenter(): NaverLatLng;
}

export interface NaverMapInstance {
  panTo(position: NaverLatLng): void;
  setCenter(position: NaverLatLng): void;
  setZoom(zoom: number): void;
  fitBounds(
    bounds: NaverLatLngBounds,
    margin?:
      | number
      | { top: number; right: number; bottom: number; left: number }
  ): void;
}

export interface NaverMarkerInstance {
  setMap(map: NaverMapInstance | null): void;
}

export interface NaverInfoWindowInstance {
  open(map: NaverMapInstance, marker: NaverMarkerInstance): void;
  close(): void;
}

export interface NaverMapsApi {
  LatLng: new (latitude: number, longitude: number) => NaverLatLng;
  LatLngBounds: new () => NaverLatLngBounds;
  Point: new (x: number, y: number) => object;
  Map: new (
    container: HTMLElement,
    options: {
      center: NaverLatLng;
      zoom: number;
      mapTypeControl?: boolean;
      mapDataControl?: boolean;
      scaleControl?: boolean;
      zoomControl?: boolean;
      zoomControlOptions?: { position: unknown };
    }
  ) => NaverMapInstance;
  Marker: new (options: {
    position: NaverLatLng;
    map?: NaverMapInstance;
    title?: string;
    icon?: {
      content: HTMLElement | string;
      anchor?: object;
    };
  }) => NaverMarkerInstance;
  InfoWindow: new (options: {
    content: HTMLElement;
    borderWidth?: number;
    backgroundColor?: string;
    disableAnchor?: boolean;
    pixelOffset?: object;
  }) => NaverInfoWindowInstance;
  Position: {
    TOP_RIGHT: unknown;
  };
  Event: {
    addListener(
      target: object,
      eventName: string,
      callback: () => void
    ): void;
  };
}

type NaverWindow = Window & {
  naver?: { maps: NaverMapsApi };
  navermap_authFailure?: () => void;
};

let sdkPromise: Promise<NaverMapsApi> | null = null;

export function naverMapsApi() {
  return (window as NaverWindow).naver?.maps;
}

export function loadNaverMaps(clientId: string) {
  const loaded = naverMapsApi();
  if (loaded) return Promise.resolve(loaded);
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise<NaverMapsApi>((resolve, reject) => {
    const target = window as NaverWindow;
    const previousAuthFailure = target.navermap_authFailure;
    target.navermap_authFailure = () => {
      previousAuthFailure?.();
      sdkPromise = null;
      reject(
        new Error(
          "네이버 지도 인증에 실패했습니다. Client ID와 Web 서비스 URL을 확인해 주세요."
        )
      );
    };

    const finish = () => {
      const maps = naverMapsApi();
      if (!maps) {
        sdkPromise = null;
        reject(new Error("네이버 지도 SDK를 불러오지 못했습니다."));
        return;
      }
      resolve(maps);
    };

    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-naver-map-sdk="true"]'
    );
    if (existing) {
      existing.addEventListener("load", finish, { once: true });
      existing.addEventListener(
        "error",
        () => {
          sdkPromise = null;
          reject(new Error("네이버 지도 연결에 실패했습니다."));
        },
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.dataset.naverMapSdk = "true";
    script.async = true;
    script.src =
      "https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=" +
      encodeURIComponent(clientId);
    script.addEventListener("load", finish, { once: true });
    script.addEventListener(
      "error",
      () => {
        sdkPromise = null;
        reject(new Error("네이버 지도 연결에 실패했습니다."));
      },
      { once: true }
    );
    document.head.appendChild(script);
  });

  return sdkPromise;
}

export function naverMapSearchUrl(
  name: string,
  address?: string | null,
  latitude?: number | string | null,
  longitude?: number | string | null
) {
  const latitudeValue = Number(latitude);
  const longitudeValue = Number(longitude);
  const hasCoordinates =
    Number.isFinite(latitudeValue) && Number.isFinite(longitudeValue);
  const query = hasCoordinates
    ? name.trim()
    : [name, address].filter(Boolean).join(" ").trim();
  const center = hasCoordinates
    ? `?c=${longitudeValue},${latitudeValue},15,0,0,0,dh`
    : "";

  return `https://map.naver.com/p/search/${encodeURIComponent(query)}${center}`;
}

export function naverMapAppRouteUrl(
  name: string,
  latitude: number | string,
  longitude: number | string,
  appName: string
) {
  const latitudeValue = Number(latitude);
  const longitudeValue = Number(longitude);

  if (!Number.isFinite(latitudeValue) || !Number.isFinite(longitudeValue)) {
    return null;
  }

  const params = new URLSearchParams({
    dlat: String(latitudeValue),
    dlng: String(longitudeValue),
    dname: name.trim(),
    appname: appName,
  });

  return `nmap://route/public?${params.toString()}`;
}
