import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { appConfig } from '@/lib/config';
import { koreaRegionDistricts } from '@/lib/korea-regions';
import { MotionPressable } from '@/components/motion-pressable';

type WeatherNow = {
  icon: string;
  temperature: number;
  condition: string;
  locationName: string;
};

type LocalityOption = {
  id: string;
  name: string;
  label: string;
  latitude: number;
  longitude: number;
};

export type WeatherHeaderLocation = {
  region: string;
  district: string;
  locality: string;
};

type Props = {
  onLocationChange?: (location: WeatherHeaderLocation) => void;
};

const regionLabels: Record<string, string> = {
  서울: '서울특별시', 부산: '부산광역시', 대구: '대구광역시', 인천: '인천광역시',
  광주: '광주광역시', 대전: '대전광역시', 울산: '울산광역시', 세종: '세종특별자치시',
  경기: '경기도', 강원: '강원특별자치도', 충북: '충청북도', 충남: '충청남도',
  전북: '전북특별자치도', 전남: '전라남도', 경북: '경상북도', 경남: '경상남도', 제주: '제주특별자치도',
};

const regions = Object.keys(koreaRegionDistricts);
const apiBaseUrl = appConfig.webUrl.replace(/\/$/, '');

export function LiveWeatherHeader({ onLocationChange }: Props) {
  const [region, setRegion] = useState('서울');
  const [district, setDistrict] = useState('전체');
  const [locality, setLocality] = useState<LocalityOption | null>(null);
  const [weather, setWeather] = useState<WeatherNow | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState('');
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [localityQuery, setLocalityQuery] = useState('');
  const [localityOptions, setLocalityOptions] = useState<LocalityOption[]>([]);
  const [localityLoading, setLocalityLoading] = useState(false);
  const [localityMessage, setLocalityMessage] = useState('시·군·구를 선택하면 읍·면·동/리를 검색할 수 있습니다.');

  const districts = useMemo(() => koreaRegionDistricts[region] ?? [], [region]);
  const locationLabel = [regionLabels[region] ?? region, district === '전체' ? '' : district, locality?.name ?? '']
    .filter(Boolean)
    .join(' ');

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ region, district });
    if (locality) {
      params.set('locality', locality.name);
      params.set('latitude', String(locality.latitude));
      params.set('longitude', String(locality.longitude));
    }

    fetch(`${apiBaseUrl}/api/weather?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || '날씨를 불러오지 못했습니다.');
        return payload as WeatherNow;
      })
      .then(setWeather)
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === 'AbortError') return;
        setWeatherError(error instanceof Error ? error.message : '날씨를 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setWeatherLoading(false);
      });

    return () => controller.abort();
  }, [district, locality, region]);

  const notifyLocation = (nextRegion: string, nextDistrict: string, nextLocality: LocalityOption | null) => {
    onLocationChange?.({
      region: nextRegion,
      district: nextDistrict,
      locality: nextLocality?.name ?? '',
    });
  };

  const selectRegion = (nextRegion: string) => {
    setWeatherLoading(true);
    setWeatherError('');
    setRegion(nextRegion);
    setDistrict('전체');
    setLocality(null);
    setLocalityOptions([]);
    setLocalityQuery('');
    setLocalityMessage('시·군·구를 선택하면 읍·면·동/리를 검색할 수 있습니다.');
    notifyLocation(nextRegion, '전체', null);
  };

  const selectDistrict = (nextDistrict: string) => {
    setWeatherLoading(true);
    setWeatherError('');
    setDistrict(nextDistrict);
    setLocality(null);
    setLocalityOptions([]);
    setLocalityQuery('');
    setLocalityMessage(nextDistrict === '전체' ? '시·군·구를 선택하면 읍·면·동/리를 검색할 수 있습니다.' : `${nextDistrict}의 읍·면·동/리를 검색해 주세요.`);
    notifyLocation(region, nextDistrict, null);
  };

  const searchLocalities = async () => {
    const query = localityQuery.trim();
    if (district === '전체') {
      setLocalityMessage('시·군·구를 먼저 선택해 주세요.');
      return;
    }
    if (query.length < 2) {
      setLocalityMessage('읍·면·동/리 이름을 2자 이상 입력해 주세요.');
      return;
    }

    setLocalityLoading(true);
    setLocalityMessage('세부 지역을 찾고 있습니다.');
    try {
      const params = new URLSearchParams({ region, district, query });
      const response = await fetch(`${apiBaseUrl}/api/weather/locations?${params.toString()}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || '세부 지역을 찾지 못했습니다.');
      const options = Array.isArray(payload?.locations) ? payload.locations as LocalityOption[] : [];
      setLocalityOptions(options);
      setLocalityMessage(options.length > 0 ? '아래에서 정확한 지역을 선택해 주세요.' : '검색 결과가 없습니다. 예: 역삼동, 우정읍, 조암리');
    } catch (error) {
      setLocalityOptions([]);
      setLocalityMessage(error instanceof Error ? error.message : '세부 지역을 찾지 못했습니다.');
    } finally {
      setLocalityLoading(false);
    }
  };

  const selectLocality = (option: LocalityOption) => {
    setWeatherLoading(true);
    setWeatherError('');
    setLocality(option);
    notifyLocation(region, district, option);
    setSelectorOpen(false);
  };

  const weatherText = weatherLoading
    ? '날씨 조회 중'
    : weatherError
      ? '날씨 다시 보기'
      : weather
        ? `${weather.icon} ${weather.temperature}° ${weather.condition}`
        : '날씨 확인';

  return (
    <>
      <View style={styles.headerRow}>
        <MotionPressable accessibilityLabel={`날씨 지역 선택, 현재 ${locationLabel}`} accessibilityRole="button" onPress={() => setSelectorOpen(true)} style={styles.locationButton}>
          <Text numberOfLines={1} style={styles.locationText}>●  {locationLabel}⌄</Text>
        </MotionPressable>
        <MotionPressable accessibilityLabel={`${locationLabel} 실시간 날씨, ${weatherText}`} accessibilityRole="button" onPress={() => setSelectorOpen(true)} style={styles.weatherButton}>
          <Text numberOfLines={1} style={[styles.weatherText, weatherError ? styles.weatherError : null]}>{weatherText}</Text>
        </MotionPressable>
      </View>

      <Modal animationType="slide" onRequestClose={() => setSelectorOpen(false)} presentationStyle="pageSheet" visible={selectorOpen}>
        <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.modalSafeArea}>
          <View style={styles.modalHeader}>
            <View><Text style={styles.modalEyebrow}>LIVE WEATHER</Text><Text style={styles.modalTitle}>날씨 지역 선택</Text></View>
            <MotionPressable accessibilityRole="button" onPress={() => setSelectorOpen(false)} style={styles.closeButton}><Text style={styles.closeText}>닫기</Text></MotionPressable>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <View style={styles.currentCard}>
              <Text numberOfLines={2} style={styles.currentLocation}>{locationLabel}</Text>
              <Text style={styles.currentWeather}>{weatherLoading ? '불러오는 중…' : weatherText}</Text>
              {weatherError ? <Text accessibilityLiveRegion="polite" style={styles.errorText}>{weatherError}</Text> : null}
            </View>

            <Text style={styles.sectionTitle}>1. 시·도</Text>
            <View style={styles.optionGrid}>
              {regions.map((item) => (
                <MotionPressable key={item} onPress={() => selectRegion(item)} style={[styles.option, item === region ? styles.optionSelected : null]}>
                  <Text style={[styles.optionText, item === region ? styles.optionTextSelected : null]}>{item}</Text>
                </MotionPressable>
              ))}
            </View>

            <Text style={styles.sectionTitle}>2. 시·군·구</Text>
            <View style={styles.optionGrid}>
              {['전체', ...districts].map((item) => (
                <MotionPressable key={item} onPress={() => selectDistrict(item)} style={[styles.option, item === district ? styles.optionSelected : null]}>
                  <Text style={[styles.optionText, item === district ? styles.optionTextSelected : null]}>{item === '전체' ? `${region} 전체` : item}</Text>
                </MotionPressable>
              ))}
            </View>

            <Text style={styles.sectionTitle}>3. 읍·면·동/리</Text>
            <View style={styles.searchRow}>
              <TextInput
                accessibilityLabel="읍면동 또는 리 이름"
                editable={district !== '전체'}
                onChangeText={setLocalityQuery}
                onSubmitEditing={() => void searchLocalities()}
                placeholder={district === '전체' ? '시·군·구를 먼저 선택' : '예: 역삼동, 우정읍, 조암리'}
                placeholderTextColor="#969696"
                returnKeyType="search"
                style={[styles.searchInput, district === '전체' ? styles.searchInputDisabled : null]}
                value={localityQuery}
              />
              <MotionPressable disabled={district === '전체' || localityLoading} onPress={() => void searchLocalities()} style={[styles.searchButton, district === '전체' ? styles.searchButtonDisabled : null]}>
                {localityLoading ? <ActivityIndicator color="#ffffff" size="small" /> : <Text style={styles.searchButtonText}>검색</Text>}
              </MotionPressable>
            </View>
            <Text accessibilityLiveRegion="polite" style={styles.helperText}>{localityMessage}</Text>

            <View style={styles.localityList}>
              {localityOptions.map((option) => (
                <MotionPressable key={option.id} onPress={() => selectLocality(option)} style={styles.localityOption}>
                  <View style={styles.localityCopy}><Text style={styles.localityName}>{option.name}</Text><Text numberOfLines={2} style={styles.localityLabel}>{option.label}</Text></View>
                  <Text style={styles.selectText}>선택</Text>
                </MotionPressable>
              ))}
            </View>

            <MotionPressable onPress={() => setSelectorOpen(false)} style={styles.applyButton}><Text style={styles.applyButtonText}>{locality ? `${locality.name} 날씨 적용` : `${district === '전체' ? region : district} 날씨 적용`}</Text></MotionPressable>
            <Text style={styles.attribution}>날씨: Open-Meteo · 지역 검색: © OpenStreetMap contributors</Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  headerRow: { marginTop: 7, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  locationButton: { minWidth: 0, flex: 1, minHeight: 24, justifyContent: 'center' },
  locationText: { color: '#252525', fontSize: 10, fontWeight: '800' },
  weatherButton: { minHeight: 24, maxWidth: '48%', justifyContent: 'center' },
  weatherText: { color: '#333333', fontSize: 10, fontWeight: '800', textAlign: 'right' },
  weatherError: { color: '#c32d28' },
  modalSafeArea: { flex: 1, backgroundColor: '#f7f7f4' },
  modalHeader: { minHeight: 76, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#e3e3de', paddingHorizontal: 18 },
  modalEyebrow: { color: '#ff3b36', fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  modalTitle: { marginTop: 4, color: '#111111', fontSize: 22, fontWeight: '900' },
  closeButton: { minWidth: 54, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#d9d9d4', borderRadius: 20, backgroundColor: '#ffffff' },
  closeText: { color: '#333333', fontSize: 12, fontWeight: '900' },
  modalContent: { padding: 18, paddingBottom: 34 },
  currentCard: { borderWidth: 1, borderColor: '#dfdfda', borderRadius: 18, backgroundColor: '#ffffff', padding: 16 },
  currentLocation: { color: '#161616', fontSize: 14, fontWeight: '900' },
  currentWeather: { marginTop: 7, color: '#161616', fontSize: 24, fontWeight: '900' },
  errorText: { marginTop: 6, color: '#c32d28', fontSize: 11, fontWeight: '700' },
  sectionTitle: { marginTop: 22, marginBottom: 10, color: '#171717', fontSize: 14, fontWeight: '900' },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  option: { minHeight: 38, justifyContent: 'center', borderWidth: 1, borderColor: '#ddddda', borderRadius: 999, backgroundColor: '#ffffff', paddingHorizontal: 12 },
  optionSelected: { borderColor: '#ff3b36', backgroundColor: '#fff0ee' },
  optionText: { color: '#555550', fontSize: 11, fontWeight: '800' },
  optionTextSelected: { color: '#d82e29', fontWeight: '900' },
  searchRow: { flexDirection: 'row', gap: 8 },
  searchInput: { minHeight: 48, flex: 1, borderWidth: 1, borderColor: '#d9d9d4', borderRadius: 13, backgroundColor: '#ffffff', color: '#171717', paddingHorizontal: 13, fontSize: 13, fontWeight: '700' },
  searchInputDisabled: { backgroundColor: '#eeeeea', color: '#999999' },
  searchButton: { minWidth: 68, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#171717' },
  searchButtonDisabled: { backgroundColor: '#a9a9a5' },
  searchButtonText: { color: '#ffffff', fontSize: 12, fontWeight: '900' },
  helperText: { marginTop: 9, color: '#666660', fontSize: 11, fontWeight: '700', lineHeight: 16 },
  localityList: { marginTop: 10, gap: 8 },
  localityOption: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderWidth: 1, borderColor: '#ddddda', borderRadius: 14, backgroundColor: '#ffffff', paddingHorizontal: 14, paddingVertical: 10 },
  localityCopy: { minWidth: 0, flex: 1 },
  localityName: { color: '#171717', fontSize: 13, fontWeight: '900' },
  localityLabel: { marginTop: 3, color: '#777772', fontSize: 10, lineHeight: 14 },
  selectText: { color: '#ff3b36', fontSize: 11, fontWeight: '900' },
  applyButton: { minHeight: 52, marginTop: 22, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#ff3b36' },
  applyButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '900' },
  attribution: { marginTop: 12, color: '#868680', fontSize: 9, lineHeight: 14, textAlign: 'center' },
});
