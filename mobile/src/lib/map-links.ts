import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';

export type MapProvider = 'kakao' | 'naver';

export type RoutablePlace = {
  name: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

const MAP_PREFERENCE_KEY = 'kopick-preferred-route-map';
const APP_PACKAGE_NAME = 'com.koreapick.app';

export async function getPreferredMap() {
  const value = await AsyncStorage.getItem(MAP_PREFERENCE_KEY);
  return value === 'naver' || value === 'kakao' ? value : null;
}

export async function setPreferredMap(provider: MapProvider | null) {
  if (provider) {
    await AsyncStorage.setItem(MAP_PREFERENCE_KEY, provider);
  } else {
    await AsyncStorage.removeItem(MAP_PREFERENCE_KEY);
  }
}

function hasCoordinates(place: RoutablePlace) {
  return Number.isFinite(place.latitude) && Number.isFinite(place.longitude);
}

function naverUrls(place: RoutablePlace) {
  const query = encodeURIComponent(`${place.name} ${place.address ?? ''}`.trim());
  if (!hasCoordinates(place)) {
    return {
      app: `nmap://search?query=${query}&appname=${APP_PACKAGE_NAME}`,
      web: `https://map.naver.com/p/search/${query}`,
    };
  }

  const name = encodeURIComponent(place.name);
  return {
    app: `nmap://route/public?dlat=${place.latitude}&dlng=${place.longitude}&dname=${name}&appname=${APP_PACKAGE_NAME}`,
    web: `https://map.naver.com/p/search/${query}`,
  };
}

function kakaoUrl(place: RoutablePlace) {
  if (hasCoordinates(place)) {
    return `https://map.kakao.com/link/to/${encodeURIComponent(place.name)},${place.latitude},${place.longitude}`;
  }
  return `https://map.kakao.com/link/search/${encodeURIComponent(`${place.name} ${place.address ?? ''}`.trim())}`;
}

export async function openRouteMap(provider: MapProvider, place: RoutablePlace) {
  if (provider === 'kakao') {
    await Linking.openURL(kakaoUrl(place));
    return;
  }

  const urls = naverUrls(place);
  try {
    await Linking.openURL(urls.app);
  } catch {
    await Linking.openURL(urls.web);
  }
}
