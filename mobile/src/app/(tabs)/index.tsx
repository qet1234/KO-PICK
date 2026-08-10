import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChoiceChips } from '@/components/choice-chips';
import { LiveWeatherCard } from '@/components/live-weather-card';
import { PlaceImage } from '@/components/place-image';
import { RouteMapChooser } from '@/components/route-map-chooser';
import { SeasonalFoods } from '@/components/seasonal-foods';
import { fetchRecommendations, type Recommendation, type RecommendationQuery } from '@/lib/api';
import { appConfig } from '@/lib/config';

const regions = ['전국','서울','부산','대구','인천','광주','대전','울산','세종','경기','강원','충북','충남','전북','전남','경북','경남','제주'] as const;
const relationships = ['개인', '커플', '친구', '가족'] as const;
const categories = ['맛집', '카페', '관광지', '축제'] as const;
const budgets = Array.from({ length: 10 }, (_, index) => `${index + 1}만원`);

const categoryCards = [
  { number: '01', english: 'DINING', title: '음식', category: '맛집', description: '한식부터 세계음식까지' },
  { number: '02', english: 'CAFE', title: '카페', category: '카페', description: '개성 있는 카페와 분위기별 추천' },
  { number: '03', english: 'FESTIVAL', title: '축제', category: '축제', description: '축제·페스티벌·지역 행사' },
  { number: '04', english: 'ATTRACTION', title: '관광지', category: '관광지', description: '박물관·전시회·공원' },
] as const;

const journeyCards = [
  { number: '01', title: '혼자', description: '내 취향대로 가볍게' },
  { number: '02', title: '커플', description: '데이트 장소 찾기' },
  { number: '03', title: '친구', description: '모임에 맞는 장소' },
  { number: '04', title: '가족', description: '온 가족이 함께' },
] as const;

const webServices = [
  { title: '함께 공간', description: '개인·커플·친구·가족 공간', path: '/spaces' },
  { title: '커플 공간', description: '초대와 함께 일정 관리', path: '/couple' },
  { title: '예약 관리', description: '예약 계획과 일정 확인', path: '/reservations' },
  { title: '고객지원', description: '문의·피드백 보내기', path: '/support' },
] as const;

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const compact = width < 370;
  const [region, setRegion] = useState<RecommendationQuery['region']>('경기');
  const [relationship, setRelationship] = useState<RecommendationQuery['relationship']>('커플');
  const [category, setCategory] = useState<RecommendationQuery['category']>('카페');
  const [budget, setBudget] = useState('5만원');
  const [items, setItems] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const recommend = async () => {
    setLoading(true); setError('');
    try {
      const result = await fetchRecommendations({ region, relationship, category, budget });
      setItems(result.items);
    } catch (nextError) {
      setItems([]); setError(nextError instanceof Error ? nextError.message : '추천 장소를 불러오지 못했습니다.');
    } finally { setLoading(false); }
  };

  const explore = (nextCategory: RecommendationQuery['category']) => {
    router.push({ pathname: '/(tabs)/explore', params: { category: nextCategory, region } });
  };

  const openWebService = async (path: string) => {
    await WebBrowser.openBrowserAsync(`${appConfig.webUrl.replace(/\/$/, '')}${path}`, {
      controlsColor: '#146b45',
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
    });
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={[styles.container, compact && styles.containerCompact]}>
        <View style={styles.intro}>
          <Text style={styles.brand}>오늘어디</Text>
          <Text style={[styles.title, compact && styles.titleCompact]}>웹의 모든 기능을{`\n`}모바일에서도 편하게</Text>
          <Text style={styles.subtitle}>Android·iOS 화면 크기에 맞춰 한 손으로 보기 좋게 정리했습니다.</Text>
        </View>

        <LiveWeatherCard />

        <View style={styles.section}>
          <Text style={styles.eyebrow}>오늘어디 JOURNEY</Text>
          <Text style={styles.sectionTitle}>누구와 가나요?</Text>
          <Text style={styles.sectionDescription}>함께하는 사람을 고르면 아래 코스 설정에 바로 반영됩니다.</Text>
          <View style={styles.grid}>
            {journeyCards.map((journey) => (
              <Pressable key={journey.title} onPress={() => setRelationship(journey.title as RecommendationQuery['relationship'])} style={[styles.journeyCard, relationship === journey.title && styles.journeyCardSelected]}>
                <Text style={styles.cardNumber}>{journey.number}</Text><Text style={styles.journeyTitle}>{journey.title}</Text>
                <Text style={styles.journeyDescription}>{journey.description}</Text><Text style={styles.cardAction}>{relationship === journey.title ? '선택됨 ✓' : '선택하기 →'}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.eyebrow}>WHAT TO FIND</Text>
          <Text style={styles.sectionTitle}>무엇을 찾고 있나요?</Text>
          <Text style={styles.sectionDescription}>웹과 같은 네 가지 카테고리를 앱의 지도에서 바로 확인하세요.</Text>
          <View style={styles.grid}>
            {categoryCards.map((item) => (
              <Pressable key={item.number} onPress={() => explore(item.category)} style={styles.categoryCard}>
                <Text style={styles.cardNumber}>{item.number}</Text><Text style={styles.cardEnglish}>{item.english}</Text>
                <Text style={styles.categoryTitle}>{item.title}</Text><Text style={styles.categoryDescription}>{item.description}</Text><Text style={styles.categoryArrow}>↗</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.eyebrow}>COURSE BUILDER</Text>
          <Text style={styles.sectionTitle}>코스 설정</Text>
          <Text style={styles.sectionDescription}>지역·관계·카테고리·예산을 골라 웹과 같은 추천 결과를 받으세요.</Text>
          <View style={styles.builder}>
            <ChoiceChips label="지역" values={regions} selected={region} onSelect={setRegion} />
            <ChoiceChips label="누구와 가나요?" values={relationships} selected={relationship} onSelect={(value) => setRelationship(value as RecommendationQuery['relationship'])} />
            <ChoiceChips label="무엇을 찾나요?" values={categories} selected={category} onSelect={(value) => setCategory(value as RecommendationQuery['category'])} />
            <ChoiceChips label="예산" values={budgets} selected={budget} onSelect={setBudget} wrap />
            <Pressable disabled={loading} onPress={() => void recommend()} style={[styles.submit, loading && styles.disabled]}>
              {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.submitText}>맞춤 장소 추천받기</Text>}
            </Pressable>
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.eyebrow}>ALL SERVICES</Text>
          <Text style={styles.sectionTitle}>웹 서비스 전체 메뉴</Text>
          <Text style={styles.sectionDescription}>웹에 있는 공간·예약·고객지원 화면도 앱 안에서 모바일 크기로 열립니다.</Text>
          <View style={styles.serviceList}>
            {webServices.map((service) => (
              <Pressable key={service.path} onPress={() => void openWebService(service.path)} style={styles.serviceButton}>
                <View style={styles.serviceCopy}><Text style={styles.serviceTitle}>{service.title}</Text><Text style={styles.serviceDescription}>{service.description}</Text></View>
                <Text style={styles.serviceArrow}>↗</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {items.length > 0 ? <View style={styles.results}>
          <Text style={styles.eyebrow}>YOUR PICKS</Text><Text style={styles.sectionTitle}>{region}에서 찾은 추천 장소</Text>
          <Text style={styles.source}>장소·사진 원천: 한국관광공사 TourAPI</Text>
          {items.map((place) => <View key={place.id} style={styles.resultCard}>
            <PlaceImage name={place.name} imageUrl={place.imageUrl} attribution={place.imageAttribution} copyrightCode={place.imageCopyrightCode} modificationAllowed={place.imageModificationAllowed} />
            <Text style={styles.score}>취향 적합도 {place.score}%</Text><Text style={styles.resultTitle}>{place.name}</Text>
            <Text style={styles.resultMeta}>{place.category} · {place.address}</Text><Text style={styles.reason}>{place.reason}</Text>
            <RouteMapChooser place={{ name: place.name, address: place.address }} />
          </View>)}
        </View> : null}

        <View accessible accessibilityLabel="새로운 기능을 준비하고 있어요. 현재 개발 중입니다." style={styles.comingSoon}>
          <View style={styles.dots}><View style={styles.dot} /><View style={styles.dot} /><View style={styles.dot} /></View>
          <Text style={styles.comingLabel}>NEW FEATURE</Text><Text style={styles.comingTitle}>새로운 기능을{`\n`}준비하고 있어요</Text>
          <Text style={styles.comingDescription}>더 편리하게 장소를 찾을 수 있는 기능을 개발 중입니다.{`\n`}조금만 기다려 주세요.</Text>
          <Text style={styles.comingStatus}>현재 개발 중</Text>
        </View>

        <SeasonalFoods />

        <View style={styles.privacy}>
          <Text style={styles.privacyEyebrow}>PRIVACY & SAFETY</Text><Text style={styles.privacyTitle}>개인정보를 소중하게 보호합니다.</Text>
          <Text style={styles.privacyText}>서비스 제공에 필요한 최소한의 정보만 처리하고, 이용 목적이 끝난 정보는 안전하게 삭제합니다.</Text>
          <Pressable onPress={() => void Linking.openURL(`${appConfig.webUrl}/privacy`)} style={styles.footerLink}><Text style={styles.footerLinkText}>개인정보처리방침 →</Text></Pressable>
          <Pressable onPress={() => void Linking.openURL(`${appConfig.webUrl}/sources`)} style={styles.footerLink}><Text style={styles.footerLinkText}>데이터 출처·저작권 →</Text></Pressable>
          <Pressable onPress={() => router.push('/(tabs)/account')} style={styles.footerLink}><Text style={styles.footerLinkText}>개인정보·계정 관리 →</Text></Pressable>
          <Text style={styles.copyright}>© 2026 오늘어디</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f8f6' },
  container: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 18, paddingTop: 18, paddingBottom: 34 },
  containerCompact: { paddingHorizontal: 14 }, intro: { marginBottom: 22 }, brand: { color: '#146b45', fontSize: 15, fontWeight: '900', letterSpacing: 1.4 },
  title: { marginTop: 9, color: '#17211c', fontSize: 30, fontWeight: '900', lineHeight: 38 }, titleCompact: { fontSize: 27, lineHeight: 34 },
  subtitle: { marginTop: 9, color: '#657069', fontSize: 13, lineHeight: 20 }, section: { marginTop: 30 }, eyebrow: { color: '#146b45', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  sectionTitle: { marginTop: 5, color: '#17211c', fontSize: 23, fontWeight: '900' }, sectionDescription: { marginTop: 7, marginBottom: 5, color: '#68736d', fontSize: 13, lineHeight: 19 },
  grid: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, journeyCard: { width: '48%', minHeight: 150, borderWidth: 1, borderColor: '#dce5e0', borderRadius: 20, backgroundColor: '#ffffff', padding: 15 },
  journeyCardSelected: { borderColor: '#146b45', backgroundColor: '#e8f7ef' }, cardNumber: { color: '#146b45', fontSize: 10, fontWeight: '900' }, journeyTitle: { marginTop: 16, color: '#1d2922', fontSize: 18, fontWeight: '900' },
  journeyDescription: { marginTop: 5, color: '#69756e', fontSize: 11, lineHeight: 16 }, cardAction: { marginTop: 'auto', color: '#146b45', fontSize: 11, fontWeight: '900' },
  categoryCard: { width: '48%', minHeight: 166, borderRadius: 20, backgroundColor: '#ffffff', padding: 15 }, cardEnglish: { marginTop: 16, color: '#7b867f', fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  categoryTitle: { marginTop: 3, color: '#1d2922', fontSize: 20, fontWeight: '900' }, categoryDescription: { marginTop: 5, color: '#69756e', fontSize: 11, lineHeight: 16 }, categoryArrow: { marginTop: 'auto', color: '#146b45', fontSize: 21, fontWeight: '900' },
  builder: { marginTop: 12, borderRadius: 23, backgroundColor: '#ffffff', padding: 18 }, submit: { minHeight: 50, marginTop: 24, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: '#146b45' },
  disabled: { opacity: 0.65 }, submitText: { color: '#ffffff', fontSize: 15, fontWeight: '900' }, error: { marginTop: 12, color: '#aa2f2f', fontSize: 12, lineHeight: 18 },
  results: { marginTop: 28 }, source: { marginTop: 6, marginBottom: 8, color: '#758079', fontSize: 11 }, resultCard: { marginTop: 12, borderRadius: 20, backgroundColor: '#ffffff', padding: 12 },
  score: { marginTop: 13, color: '#146b45', fontSize: 11, fontWeight: '900' }, resultTitle: { marginTop: 5, color: '#1d2922', fontSize: 18, fontWeight: '900' }, resultMeta: { marginTop: 5, color: '#6a756e', fontSize: 11, lineHeight: 17 }, reason: { marginTop: 8, marginBottom: 13, color: '#435048', fontSize: 12, lineHeight: 19 },
  comingSoon: { minHeight: 290, marginTop: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: '#17211c', padding: 24 }, dots: { width: 62, height: 62, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: '#8fae36', borderRadius: 20, backgroundColor: '#273323' },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#caff2c' }, comingLabel: { marginTop: 18, color: '#caff2c', fontSize: 9, fontWeight: '900', letterSpacing: 1.7 }, comingTitle: { marginTop: 10, color: '#ffffff', fontSize: 25, fontWeight: '900', lineHeight: 32, textAlign: 'center' },
  serviceList: { marginTop: 12, borderRadius: 20, backgroundColor: '#ffffff', paddingHorizontal: 16 }, serviceButton: { minHeight: 68, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e2e8e4' },
  serviceCopy: { flex: 1, paddingVertical: 12 }, serviceTitle: { color: '#1d2922', fontSize: 14, fontWeight: '900' }, serviceDescription: { marginTop: 3, color: '#6c7770', fontSize: 11 }, serviceArrow: { color: '#146b45', fontSize: 20, fontWeight: '900' },
  comingDescription: { marginTop: 12, color: '#c8d0cb', fontSize: 12, lineHeight: 20, textAlign: 'center' }, comingStatus: { marginTop: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#536059', borderRadius: 999, color: '#d7ddd9', fontSize: 10, fontWeight: '800', paddingHorizontal: 14, paddingVertical: 8 },
  privacy: { marginTop: 30, borderRadius: 24, backgroundColor: '#17211c', padding: 20 }, privacyEyebrow: { color: '#b7e936', fontSize: 9, fontWeight: '900', letterSpacing: 1.2 }, privacyTitle: { marginTop: 7, color: '#ffffff', fontSize: 20, fontWeight: '900', lineHeight: 27 }, privacyText: { marginTop: 8, marginBottom: 10, color: '#c8d0cb', fontSize: 12, lineHeight: 19 },
  footerLink: { minHeight: 46, justifyContent: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#3d4942' }, footerLinkText: { color: '#e6ece8', fontSize: 13, fontWeight: '800' }, copyright: { marginTop: 14, color: '#8e9992', fontSize: 10 },
});
