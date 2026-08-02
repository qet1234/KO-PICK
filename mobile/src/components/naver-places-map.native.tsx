import {
  NaverMapMarkerOverlay,
  NaverMapView,
} from '@mj-studio/react-native-naver-map';
import { StyleSheet, Text, View } from 'react-native';

import type { MapPlace, NaverPlacesMapProps } from '@/components/naver-places-map';
import { appConfig } from '@/lib/config';

export function NaverPlacesMap<T extends MapPlace>({ places, selectedId, onSelect }: NaverPlacesMapProps<T>) {
  const first = places[0];

  if (!appConfig.isNaverMapConfigured) {
    return (
      <View style={styles.message}>
        <Text style={styles.messageTitle}>네이버 지도 Client ID가 필요합니다</Text>
        <Text style={styles.messageText}>
          EXPO_PUBLIC_NAVER_MAP_CLIENT_ID를 설정하면 선택한 장소가 앱 지도에 표시됩니다.
        </Text>
      </View>
    );
  }

  return (
    <NaverMapView
      key={`${first?.latitude ?? 'empty'}-${first?.longitude ?? 'empty'}`}
      style={styles.map}
      initialCamera={{
        latitude: first?.latitude ?? 37.5665,
        longitude: first?.longitude ?? 126.978,
        zoom: first ? 11 : 7,
      }}
      isShowZoomControls>
      {places.map((place) => (
        <NaverMapMarkerOverlay
          key={place.id}
          latitude={place.latitude}
          longitude={place.longitude}
          caption={{
            text: place.name,
            color: selectedId === place.id ? '#146b45' : '#27352e',
            haloColor: '#ffffff',
            textSize: selectedId === place.id ? 14 : 12,
          }}
          image={{ symbol: selectedId === place.id ? 'green' : 'red' }}
          width={selectedId === place.id ? 34 : 28}
          height={selectedId === place.id ? 42 : 34}
          zIndex={selectedId === place.id ? 10 : 1}
          onTap={() => onSelect(place)}
        />
      ))}
    </NaverMapView>
  );
}

const styles = StyleSheet.create({
  map: { height: 300, borderRadius: 20 },
  message: {
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#fff7df',
    padding: 24,
  },
  messageTitle: { color: '#654a00', fontSize: 16, fontWeight: '900' },
  messageText: {
    marginTop: 8,
    color: '#745f25',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
});
