import { StyleSheet, Text, View } from 'react-native';

import type { TourPlace } from '@/lib/api';

export type NaverPlacesMapProps = {
  places: TourPlace[];
  selectedId: string | null;
  onSelect: (place: TourPlace) => void;
};

export function NaverPlacesMap({ places }: NaverPlacesMapProps) {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.title}>네이버 지도</Text>
      <Text style={styles.description}>
        {places.length > 0
          ? `Android·iOS 개발 빌드에서 장소 ${places.length}곳을 지도에 표시합니다.`
          : '장소를 조회하면 앱 지도에 마커가 표시됩니다.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#eaf3ef',
    padding: 24,
  },
  title: { color: '#146b45', fontSize: 18, fontWeight: '900' },
  description: {
    marginTop: 8,
    color: '#5f6c65',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
});
