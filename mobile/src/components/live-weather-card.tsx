import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';

import { MotionPressable } from '@/components/motion-pressable';
import { appConfig } from '@/lib/config';
import { koreaRegionDistricts, koreaRegions } from '@/lib/korea-regions';

type Forecast = {
  time: string;
  condition: string;
  icon: string;
  temperature: number;
  apparentTemperature: number;
  precipitationProbability: number;
  windSpeed: number;
};

type DailyForecast = {
  date: string;
  condition: string;
  icon: string;
  maxTemperature: number;
  minTemperature: number;
  precipitationProbability: number;
};

type WeatherData = {
  locationName: string;
  updatedAt: string;
  icon: string;
  condition: string;
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  currentPrecipitationProbability: number;
  windSpeed: number;
  maxTemperature: number;
  minTemperature: number;
  indoorRecommended: boolean;
  recommendation: string;
  hourly: Forecast[];
  daily: DailyForecast[];
};

type WeatherVisualState = 'sunny' | 'cloudy' | 'rainy';
type PickerKind = 'region' | 'district';

function weatherVisualState(condition: string, precipitationProbability: number): WeatherVisualState {
  if (precipitationProbability >= 60 || /비|소나기|눈|진눈깨비/.test(condition)) return 'rainy';
  if (precipitationProbability >= 30 || /구름|흐림|안개/.test(condition)) return 'cloudy';
  return 'sunny';
}

function hourLabel(value: string, index: number) {
  if (index === 0) return '현재';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value.slice(11, 16) : date.toLocaleTimeString('ko-KR', { hour: '2-digit' });
}

function dayLabel(value: string) {
  const date = new Date(`${value}T00:00:00+09:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('ko-KR', { weekday: 'short', month: 'numeric', day: 'numeric' });
}

export function LiveWeatherCard() {
  const [region, setRegion] = useState('서울');
  const [district, setDistrict] = useState('전체');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [selectedHour, setSelectedHour] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [picker, setPicker] = useState<PickerKind | null>(null);
  const districts = ['전체', ...(koreaRegionDistricts[region] ?? [])];
  const active = weather?.hourly[selectedHour] ?? weather;
  const activeCondition = active?.condition ?? weather?.condition ?? '날씨 확인';
  const activePrecipitation = active && 'precipitationProbability' in active
    ? active.precipitationProbability
    : weather?.currentPrecipitationProbability ?? 0;
  const visualState = weatherVisualState(activeCondition, activePrecipitation);
  const pickerValues = picker === 'region' ? koreaRegions : districts;
  const pickerSelected = picker === 'region' ? region : district;

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({ region, district });
        const response = await fetch(`${appConfig.webUrl.replace(/\/$/, '')}/api/weather?${params.toString()}`, {
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });
        const payload = await response.json() as WeatherData & { error?: string };
        if (!response.ok) throw new Error(payload.error || '날씨를 불러오지 못했습니다.');
        setWeather(payload);
        setSelectedHour(0);
      } catch (nextError) {
        if (!controller.signal.aborted) {
          setWeather(null);
          setError(nextError instanceof Error ? nextError.message : '날씨를 불러오지 못했습니다.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    const timer = setInterval(() => void load(), 10 * 60 * 1000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [district, region]);

  return (
    <View style={[styles.card, visualState === 'sunny' && styles.cardSunny, visualState === 'cloudy' && styles.cardCloudy, visualState === 'rainy' && styles.cardRainy]}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>LIVE KOREA WEATHER</Text>
          <Text style={styles.title}>전국 실시간 날씨</Text>
          <Text style={styles.headerDescription}>시간대별 강수확률에 따라 해·구름·비 화면이 자동으로 전환됩니다.</Text>
        </View>
        <View style={styles.live}><View style={styles.liveDot} /><Text style={styles.liveText}>10분 자동 갱신</Text></View>
      </View>

      <View style={styles.locationControls}>
        <View style={styles.locationField}>
          <Text style={styles.locationFieldLabel}>시·도 선택</Text>
          <MotionPressable accessibilityRole="button" onPress={() => setPicker('region')} style={styles.locationButton}>
            <Text style={styles.locationButtonText}>{region}</Text><Text style={styles.locationChevron}>⌄</Text>
          </MotionPressable>
        </View>
        <View style={styles.locationField}>
          <Text style={styles.locationFieldLabel}>시·군·구 선택</Text>
          <MotionPressable accessibilityRole="button" onPress={() => setPicker('district')} style={styles.locationButton}>
            <Text numberOfLines={1} style={styles.locationButtonText}>{district === '전체' ? `${region} 전체` : district}</Text><Text style={styles.locationChevron}>⌄</Text>
          </MotionPressable>
        </View>
      </View>

      {loading ? <View style={styles.state}><ActivityIndicator color="#ff3b36" /><Text style={styles.stateText}>날씨를 불러오고 있어요.</Text></View> : null}
      {!loading && error ? <Text style={styles.error}>{error}</Text> : null}
      {!loading && weather && active ? (
        <>
          <View style={[styles.now, visualState === 'sunny' && styles.nowSunny, visualState === 'cloudy' && styles.nowCloudy, visualState === 'rainy' && styles.nowRainy]}>
            <Text style={styles.weatherIcon}>{'icon' in active ? active.icon : weather.icon}</Text>
            <View style={styles.nowCopy}>
              <Text style={styles.location}>{weather.locationName} · {selectedHour === 0 ? '현재' : hourLabel(weather.hourly[selectedHour]?.time ?? '', selectedHour)}</Text>
              <Text style={styles.temperature}>{active.temperature}°</Text>
              <Text style={styles.condition}>{active.condition} · 체감 {active.apparentTemperature}°</Text>
            </View>
          </View>
          <View style={styles.metrics}>
            <View style={styles.metric}><Text style={styles.metricLabel}>강수</Text><Text style={styles.metricValue}>{'precipitationProbability' in active ? active.precipitationProbability : weather.currentPrecipitationProbability}%</Text></View>
            <View style={styles.metric}><Text style={styles.metricLabel}>습도</Text><Text style={styles.metricValue}>{weather.humidity}%</Text></View>
            <View style={styles.metric}><Text style={styles.metricLabel}>풍속</Text><Text style={styles.metricValue}>{active.windSpeed}km/h</Text></View>
            <View style={styles.metric}><Text style={styles.metricLabel}>오늘</Text><Text style={styles.metricValue}>{weather.maxTemperature}°/{weather.minTemperature}°</Text></View>
          </View>
          <Text style={styles.sectionLabel}>시간대별 예보</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.forecastRow}>
            {weather.hourly.slice(0, 12).map((item, index) => (
              <MotionPressable key={item.time} onPress={() => setSelectedHour(index)} style={[styles.hourCard, selectedHour === index && styles.hourCardSelected]}>
                <Text style={styles.hour}>{hourLabel(item.time, index)}</Text><Text style={styles.hourIcon}>{item.icon}</Text>
                <Text style={styles.hourTemp}>{item.temperature}°</Text><Text style={styles.rain}>{item.precipitationProbability}%</Text>
              </MotionPressable>
            ))}
          </ScrollView>
          <Text style={styles.sectionLabel}>주간 예보</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.forecastRow}>
            {weather.daily.slice(0, 7).map((item) => (
              <View key={item.date} style={styles.dayCard}><Text style={styles.day}>{dayLabel(item.date)}</Text><Text style={styles.hourIcon}>{item.icon}</Text>
                <Text style={styles.hourTemp}>{item.maxTemperature}° <Text style={styles.minTemp}>{item.minTemperature}°</Text></Text><Text style={styles.rain}>{item.precipitationProbability}%</Text>
              </View>
            ))}
          </ScrollView>
          <View style={styles.pick}><Text style={styles.pickLabel}>WEATHER PICK</Text><Text style={styles.pickText}>{weather.recommendation}</Text></View>
          <MotionPressable accessibilityRole="link" onPress={() => void Linking.openURL('https://open-meteo.com/en/licence')}>
            <Text style={styles.attribution}>Weather data by Open-Meteo.com · CC BY 4.0</Text>
          </MotionPressable>
        </>
      ) : null}

      <Modal animationType="fade" onRequestClose={() => setPicker(null)} transparent visible={picker !== null}>
        <View style={styles.modalRoot}>
          <MotionPressable accessibilityLabel="지역 선택 닫기" onPress={() => setPicker(null)} style={styles.modalBackdrop} />
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHeader}>
              <View><Text style={styles.pickerEyebrow}>WEATHER LOCATION</Text><Text style={styles.pickerTitle}>{picker === 'region' ? '시·도 선택' : '시·군·구 선택'}</Text></View>
              <MotionPressable accessibilityRole="button" onPress={() => setPicker(null)} style={styles.pickerClose}><Text style={styles.pickerCloseText}>닫기</Text></MotionPressable>
            </View>
            <ScrollView contentContainerStyle={styles.pickerList} showsVerticalScrollIndicator={false}>
              {pickerValues.map((value) => (
                <MotionPressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: pickerSelected === value }}
                  key={value}
                  onPress={() => {
                    if (picker === 'region') {
                      setRegion(value);
                      setDistrict('전체');
                    } else {
                      setDistrict(value);
                    }
                    setPicker(null);
                  }}
                  style={[styles.pickerItem, pickerSelected === value && styles.pickerItemSelected]}
                >
                  <Text style={[styles.pickerItemText, pickerSelected === value && styles.pickerItemTextSelected]}>{value === '전체' && picker === 'district' ? `${region} 전체` : value}</Text>
                  {pickerSelected === value ? <Text style={styles.pickerCheck}>✓</Text> : null}
                </MotionPressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: '#dcdcd6', borderRadius: 19, backgroundColor: '#f8fbff', padding: 20, overflow: 'hidden' },
  cardSunny: { borderColor: '#f0dba6', backgroundColor: '#fff8dc' },
  cardCloudy: { borderColor: '#cfd9e4', backgroundColor: '#e8eef4' },
  cardRainy: { borderColor: '#a9bbcf', backgroundColor: '#cfddea' },
  attribution: { marginTop: 12, color: '#536274', fontSize: 11, fontWeight: '700', textDecorationLine: 'underline' },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  headerCopy: { flex: 1 }, eyebrow: { color: '#ff3b36', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  title: { marginTop: 7, color: '#101010', fontSize: 28, lineHeight: 34, fontWeight: '900', letterSpacing: -1.1 },
  headerDescription: { marginTop: 7, color: '#454541', fontSize: 11, fontWeight: '600', lineHeight: 18 },
  live: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: '#e0e0da', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.86)', paddingHorizontal: 9, paddingVertical: 7 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#16a05d' }, liveText: { color: '#454541', fontSize: 10, fontWeight: '800' },
  locationControls: { marginTop: 18, flexDirection: 'row', gap: 8 },
  locationField: { flex: 1, minWidth: 0, borderWidth: 1, borderColor: '#dcdcd6', borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 12, paddingTop: 10, paddingBottom: 7 },
  locationFieldLabel: { color: '#666660', fontSize: 9, fontWeight: '900' },
  locationButton: { minHeight: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  locationButtonText: { flex: 1, color: '#111111', fontSize: 13, fontWeight: '900' }, locationChevron: { color: '#71716d', fontSize: 16, fontWeight: '900' },
  state: { minHeight: 170, alignItems: 'center', justifyContent: 'center', gap: 10 }, stateText: { color: '#71716d', fontSize: 13 },
  error: { marginTop: 18, borderRadius: 14, backgroundColor: '#fff0ee', color: '#a71d19', padding: 14, fontSize: 12, lineHeight: 18 },
  now: { marginTop: 20, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e2e7ed', borderRadius: 20, backgroundColor: '#ffffff', padding: 16 },
  nowSunny: { borderColor: '#edc158', backgroundColor: '#fffbee' }, nowCloudy: { borderColor: '#a2b3c4', backgroundColor: '#f3f7fa' }, nowRainy: { borderColor: '#6684a4', backgroundColor: '#e7f0f8' },
  weatherIcon: { width: 70, fontSize: 48, textAlign: 'center' }, nowCopy: { flex: 1, paddingLeft: 12 }, location: { color: '#5c6470', fontSize: 11, fontWeight: '700' },
  temperature: { marginTop: 2, color: '#101010', fontSize: 40, fontWeight: '900' }, condition: { color: '#454541', fontSize: 12 },
  metrics: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, metric: { width: '48%', borderWidth: 1, borderColor: '#e2e7ed', borderRadius: 12, backgroundColor: '#ffffff', padding: 11 },
  metricLabel: { color: '#71716d', fontSize: 10 }, metricValue: { marginTop: 3, color: '#101010', fontSize: 14, fontWeight: '900' },
  sectionLabel: { marginTop: 18, marginBottom: 9, color: '#101010', fontSize: 13, fontWeight: '900' }, forecastRow: { gap: 8, paddingRight: 8 },
  hourCard: { minWidth: 76, alignItems: 'center', borderWidth: 1, borderColor: '#e0e5eb', borderRadius: 15, backgroundColor: '#ffffff', paddingHorizontal: 10, paddingVertical: 12 },
  hourCardSelected: { borderColor: '#3478bd', backgroundColor: '#eef6ff' }, hour: { color: '#5c6470', fontSize: 10, fontWeight: '700' }, hourIcon: { marginTop: 7, fontSize: 22 },
  hourTemp: { marginTop: 5, color: '#101010', fontSize: 14, fontWeight: '900' }, rain: { marginTop: 3, color: '#2f6fae', fontSize: 10, fontWeight: '800' },
  dayCard: { minWidth: 110, alignItems: 'center', borderWidth: 1, borderColor: '#e0e0da', borderRadius: 15, backgroundColor: '#ffffff', padding: 12 }, day: { color: '#5c6470', fontSize: 10, fontWeight: '700' }, minTemp: { color: '#71716d' },
  pick: { marginTop: 18, borderRadius: 15, backgroundColor: '#101010', padding: 14 }, pickLabel: { color: '#ff736d', fontSize: 9, fontWeight: '900', letterSpacing: 1 }, pickText: { marginTop: 4, color: '#ffffff', fontSize: 13, fontWeight: '800', lineHeight: 19 },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(16,16,16,0.52)' },
  pickerSheet: { maxHeight: '72%', borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: '#f7f7f4', paddingHorizontal: 18, paddingTop: 20, paddingBottom: 26 },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 }, pickerEyebrow: { color: '#ff3b36', fontSize: 9, fontWeight: '900', letterSpacing: 1.2 }, pickerTitle: { marginTop: 5, color: '#101010', fontSize: 23, fontWeight: '900' },
  pickerClose: { minWidth: 54, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#dadad4', borderRadius: 999, backgroundColor: '#ffffff' }, pickerCloseText: { color: '#454541', fontSize: 12, fontWeight: '900' },
  pickerList: { paddingTop: 16, gap: 8 }, pickerItem: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#dadad4', borderRadius: 14, backgroundColor: '#ffffff', paddingHorizontal: 15 }, pickerItemSelected: { borderColor: '#ff3b36', backgroundColor: '#fff0ee' }, pickerItemText: { color: '#454541', fontSize: 14, fontWeight: '800' }, pickerItemTextSelected: { color: '#ff3b36', fontWeight: '900' }, pickerCheck: { color: '#ff3b36', fontSize: 15, fontWeight: '900' },
});
