import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LiveWeatherCard } from '@/components/live-weather-card';
import { MotionPressable } from '@/components/motion-pressable';
import { SeasonalFoods } from '@/components/seasonal-foods';
import { appConfig } from '@/lib/config';

const categoryCards = [
  { number: '01', english: 'DINING', title: '음식', category: '맛집', description: '한식부터 세계음식까지' },
  { number: '02', english: 'CAFE', title: '카페', category: '카페', description: '개성 있는 카페와 분위기별 추천' },
  { number: '03', english: 'FESTIVAL', title: '축제', category: '축제', description: '축제·페스티벌·지역 행사' },
  { number: '04', english: 'ATTRACTION', title: '관광지', category: '관광지', description: '박물관·전시회·공원' },
] as const;

const journeyCards = [
  { number: '01', label: '혼자', title: '내 취향대로 가볍게', description: '혼밥, 조용한 카페와 혼자 둘러보기 좋은 장소만 모아보세요.' },
  { number: '02', label: '커플', title: '데이트 장소 찾기', description: '네이버 검색 반응이 많은 카페·맛집·데이트 명소를 우선 확인하세요.' },
  { number: '03', label: '친구', title: '모임에 맞는 장소', description: '여럿이 방문하기 좋은 맛집, 축제와 즐길 거리를 확인하세요.' },
  { number: '04', label: '가족', title: '온 가족이 함께', description: '아이와 부모님까지 편하게 즐길 수 있는 장소를 찾아보세요.' },
] as const;

const privacyCards = [
  { number: '01', title: '필요한 정보만 처리', description: '소셜 로그인 정보는 회원 식별과 서비스 제공 목적으로만 사용합니다.' },
  { number: '02', title: '공간 정보 비공개', description: '개인·친구·가족 공간의 일정과 기록은 구성원만 확인할 수 있습니다.' },
  { number: '03', title: '탈퇴 시 안전하게 삭제', description: '법령상 보관 의무가 있는 경우를 제외하고 개인정보와 저장 데이터를 삭제합니다.' },
] as const;

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const compact = width < 370;
  const tablet = width >= 640;

  const explore = (category: string) => {
    router.push({ pathname: '/(tabs)/explore', params: { category } });
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={[styles.container, compact && styles.containerCompact]}>
        <View style={styles.heroFrame}>
          <LiveWeatherCard />

          <View style={styles.journeyPanel}>
            <Text style={styles.eyebrow}>오늘어디 JOURNEY</Text>
            <Text style={styles.journeyHeading}>누구와 가나요?</Text>
            <Text style={styles.journeyIntro}>예약 중심이 아니라 함께하는 사람과 목적에 맞춰 전국의 장소를 탐색합니다.</Text>

            <View style={styles.journeyGrid}>
              {journeyCards.map((journey) => (
                <MotionPressable
                  accessibilityRole="button"
                  key={journey.label}
                  onPress={() => explore('전체')}
                  style={[styles.journeyCard, tablet && styles.journeyCardTablet]}
                >
                  <Text style={styles.journeyNumber}>{journey.number}</Text>
                  <Text style={styles.journeyPill}>{journey.label}</Text>
                  <Text style={styles.journeyTitle}>{journey.title}</Text>
                  <Text style={styles.journeyDescription}>{journey.description}</Text>
                  <Text style={styles.journeyAction}>지도에서 찾기 →</Text>
                </MotionPressable>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.categorySection}>
          <Text style={styles.eyebrow}>WHAT TO FIND</Text>
          <Text style={styles.sectionTitle}>무엇을 찾고 있나요?</Text>
          <Text style={styles.sectionDescription}>맛집과 카페를 찾고, 예약 지원 매장은 카드에서 네이버 예약으로 바로 이동하세요.</Text>
          <View style={styles.categoryGrid}>
            {categoryCards.map((item) => (
              <MotionPressable
                accessibilityRole="button"
                key={item.number}
                onPress={() => explore(item.category)}
                style={[styles.categoryCard, tablet && styles.categoryCardTablet]}
              >
                <View style={styles.categoryAccent} />
                <Text style={styles.categoryNumber}>{item.number}</Text>
                <View style={styles.categoryCopy}>
                  <Text style={styles.categoryEnglish}>{item.english}</Text>
                  <Text style={styles.categoryTitle}>{item.title}</Text>
                  <Text style={styles.categoryDescription}>{item.description}</Text>
                </View>
                <View style={styles.categoryArrow}><Text style={styles.categoryArrowText}>↗</Text></View>
              </MotionPressable>
            ))}
          </View>
        </View>

        <View accessible accessibilityLabel="새로운 기능을 준비하고 있어요. 현재 개발 중입니다." style={styles.comingSection}>
          <View style={styles.comingSoon}>
            <View style={styles.dots}><View style={styles.dot} /><View style={styles.dot} /><View style={styles.dot} /></View>
            <Text style={styles.comingLabel}>NEW FEATURE</Text>
            <Text style={styles.comingTitle}>새로운 기능을{`\n`}준비하고 있어요</Text>
            <Text style={styles.comingDescription}>더 편리하게 장소를 찾을 수 있는 기능을 개발 중입니다.{`\n`}조금만 기다려 주세요.</Text>
            <Text style={styles.comingStatus}>현재 개발 중</Text>
          </View>
        </View>

        <SeasonalFoods />

        <View style={styles.privacy}>
          <Text style={styles.privacyEyebrow}>PRIVACY &amp; SAFETY</Text>
          <Text style={styles.privacyTitle}>개인정보를 소중하게 보호합니다.</Text>
          <Text style={styles.privacyText}>서비스 제공에 필요한 최소한의 정보만 처리하고, 이용 목적이 끝난 정보는 안전하게 삭제합니다.</Text>
          <View style={styles.privacyGrid}>
            {privacyCards.map((item) => (
              <View key={item.number} style={styles.privacyCard}>
                <Text style={styles.privacyNumber}>{item.number}</Text>
                <Text style={styles.privacyCardTitle}>{item.title}</Text>
                <Text style={styles.privacyCardText}>{item.description}</Text>
              </View>
            ))}
          </View>
          <View style={styles.privacyFooter}>
            <Text style={styles.copyright}>© 2026 오늘어디</Text>
            <MotionPressable onPress={() => void Linking.openURL(`${appConfig.webUrl}/privacy`)} style={styles.footerLink}><Text style={styles.footerLinkText}>개인정보처리방침 →</Text></MotionPressable>
            <MotionPressable onPress={() => void Linking.openURL(`${appConfig.webUrl}/sources`)} style={styles.footerLink}><Text style={styles.footerLinkText}>데이터 출처·저작권 →</Text></MotionPressable>
            <MotionPressable onPress={() => router.push('/(tabs)/account')} style={styles.footerLink}><Text style={styles.footerLinkText}>개인정보·계정 관리 →</Text></MotionPressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f7f7f4' },
  container: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 38 },
  containerCompact: { paddingHorizontal: 12 },
  heroFrame: { padding: 10, borderWidth: 1, borderColor: '#deded8', borderRadius: 28, backgroundColor: '#ffffff', shadowColor: '#1f1914', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.13, shadowRadius: 22, elevation: 7 },
  journeyPanel: { marginTop: 12, padding: 20, borderWidth: 1, borderColor: '#deded8', borderRadius: 19, backgroundColor: '#f8f8f5' },
  eyebrow: { color: '#ff3b36', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  journeyHeading: { marginTop: 7, color: '#111111', fontSize: 30, lineHeight: 36, fontWeight: '900', letterSpacing: -1.4 },
  journeyIntro: { marginTop: 8, color: '#42423f', fontSize: 12, fontWeight: '600', lineHeight: 20 },
  journeyGrid: { marginTop: 20, flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  journeyCard: { width: '100%', minHeight: 170, padding: 18, position: 'relative', overflow: 'hidden', borderWidth: 1, borderColor: '#deded8', borderRadius: 18, backgroundColor: '#ffffff', shadowColor: '#111111', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  journeyCardTablet: { width: '48%' },
  journeyNumber: { position: 'absolute', top: 12, right: 14, color: '#c9c9c3', fontSize: 30, fontWeight: '900' },
  journeyPill: { alignSelf: 'flex-start', overflow: 'hidden', borderRadius: 999, color: '#ffffff', backgroundColor: '#ff3b36', paddingHorizontal: 9, paddingVertical: 5, fontSize: 10, fontWeight: '900' },
  journeyTitle: { marginTop: 13, color: '#111111', fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  journeyDescription: { marginTop: 7, maxWidth: '88%', color: '#444440', fontSize: 11, fontWeight: '600', lineHeight: 18 },
  journeyAction: { marginTop: 'auto', paddingTop: 14, color: '#111111', fontSize: 11, fontWeight: '900' },
  categorySection: { marginTop: 44 },
  sectionTitle: { marginTop: 9, color: '#111111', fontSize: 32, lineHeight: 38, fontWeight: '900', letterSpacing: -1.5 },
  sectionDescription: { marginTop: 10, color: '#454541', fontSize: 13, fontWeight: '600', lineHeight: 21 },
  categoryGrid: { marginTop: 24, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoryCard: { width: '100%', minHeight: 190, padding: 24, position: 'relative', justifyContent: 'space-between', overflow: 'hidden', borderWidth: 1, borderColor: '#deded8', borderRadius: 18, backgroundColor: '#ffffff', shadowColor: '#111111', shadowOffset: { width: 0, height: 9 }, shadowOpacity: 0.06, shadowRadius: 15, elevation: 3 },
  categoryCardTablet: { width: '48%' },
  categoryAccent: { width: 4, height: 68, position: 'absolute', top: 61, left: 0, borderTopRightRadius: 999, borderBottomRightRadius: 999, backgroundColor: '#ff3b36' },
  categoryNumber: { alignSelf: 'flex-start', overflow: 'hidden', borderWidth: 1, borderColor: '#deded8', borderRadius: 999, backgroundColor: '#ffffff', color: '#111111', paddingHorizontal: 9, paddingVertical: 5, fontSize: 10, fontWeight: '900' },
  categoryCopy: { marginTop: 20 },
  categoryEnglish: { color: '#ff3b36', fontSize: 10, fontWeight: '900', letterSpacing: 0.9 },
  categoryTitle: { marginTop: 10, color: '#111111', fontSize: 23, fontWeight: '900', letterSpacing: -1 },
  categoryDescription: { marginTop: 6, maxWidth: '78%', color: '#494945', fontSize: 12, fontWeight: '600', lineHeight: 18 },
  categoryArrow: { width: 44, height: 44, position: 'absolute', right: 14, bottom: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#d2d2cc', borderRadius: 22, backgroundColor: '#ffffff' },
  categoryArrowText: { color: '#101010', fontSize: 19, fontWeight: '800' },
  comingSection: { marginTop: 52, marginHorizontal: -16, padding: 16, backgroundColor: '#101010' },
  comingSoon: { minHeight: 360, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#30302e', borderRadius: 28, backgroundColor: '#191918', padding: 28 },
  dots: { width: 72, height: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, borderColor: '#617524', borderRadius: 24, backgroundColor: '#202414' },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#caff2c' },
  comingLabel: { marginTop: 24, color: '#caff2c', fontSize: 10, fontWeight: '900', letterSpacing: 1.8 },
  comingTitle: { marginTop: 14, color: '#ffffff', fontSize: 31, fontWeight: '900', lineHeight: 36, letterSpacing: -1.4, textAlign: 'center' },
  comingDescription: { marginTop: 18, color: '#c8c8c2', fontSize: 13, fontWeight: '600', lineHeight: 23, textAlign: 'center' },
  comingStatus: { marginTop: 28, overflow: 'hidden', borderWidth: 1, borderColor: '#40403d', borderRadius: 999, color: '#b8b8b3', paddingHorizontal: 15, paddingVertical: 9, fontSize: 10, fontWeight: '800' },
  privacy: { marginTop: 42, borderRadius: 28, backgroundColor: '#101010', padding: 22 },
  privacyEyebrow: { color: '#caff2c', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  privacyTitle: { marginTop: 10, color: '#ffffff', fontSize: 28, fontWeight: '900', lineHeight: 34, letterSpacing: -1.1 },
  privacyText: { marginTop: 10, color: '#d2d2cd', fontSize: 12, fontWeight: '600', lineHeight: 20 },
  privacyGrid: { marginTop: 22, gap: 10 },
  privacyCard: { padding: 17, borderWidth: 1, borderColor: '#333330', borderRadius: 17, backgroundColor: '#1b1b1a' },
  privacyNumber: { color: '#caff2c', fontSize: 10, fontWeight: '900' },
  privacyCardTitle: { marginTop: 10, color: '#ffffff', fontSize: 17, fontWeight: '900' },
  privacyCardText: { marginTop: 7, color: '#c8c8c2', fontSize: 11, fontWeight: '600', lineHeight: 18 },
  privacyFooter: { marginTop: 22, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#3a3a38', paddingTop: 12 },
  copyright: { marginBottom: 8, color: '#8b8b85', fontSize: 10 },
  footerLink: { minHeight: 44, justifyContent: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#30302e' },
  footerLinkText: { color: '#f0f0eb', fontSize: 12, fontWeight: '800' },
});
