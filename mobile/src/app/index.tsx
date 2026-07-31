import * as Linking from 'expo-linking';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { appConfig } from '@/lib/config';

const readinessItems = [
  {
    title: '공용 코드베이스',
    description: '한 프로젝트에서 Android와 iOS 화면을 함께 개발합니다.',
  },
  {
    title: '기존 데이터 연결',
    description: '웹과 같은 Supabase Auth, PostgreSQL, RLS, Edge Functions를 사용합니다.',
  },
  {
    title: '앱 로그인 준비',
    description: '모바일 세션은 기기의 보안 저장소에 보관하도록 분리했습니다.',
  },
  {
    title: '딥링크 준비',
    description: 'kopick:// 주소 체계를 예약해 OAuth와 공유 링크를 연결할 수 있습니다.',
  },
];

export default function HomeScreen() {
  const connectionLabel = appConfig.isSupabaseConfigured ? '연결 준비 완료' : '환경변수 입력 필요';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>ANDROID · iOS</Text>
        </View>

        <Text style={styles.logo}>KO-PICK</Text>
        <Text style={styles.title}>모바일 앱 개발 기반</Text>
        <Text style={styles.subtitle}>
          기존 웹 서비스를 유지하면서 앱 기능을 순서대로 옮길 수 있도록 준비했습니다.
        </Text>

        <View style={styles.connectionCard}>
          <View style={[styles.statusDot, appConfig.isSupabaseConfigured && styles.statusDotReady]} />
          <View style={styles.connectionCopy}>
            <Text style={styles.connectionTitle}>Supabase</Text>
            <Text style={styles.connectionText}>{connectionLabel}</Text>
          </View>
        </View>

        <View style={styles.list}>
          {readinessItems.map((item, index) => (
            <View key={item.title} style={styles.item}>
              <Text style={styles.itemNumber}>{index + 1}</Text>
              <View style={styles.itemCopy}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemDescription}>{item.description}</Text>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity
          accessibilityRole="link"
          onPress={() => Linking.openURL(appConfig.webUrl)}
          style={styles.webButton}>
          <Text style={styles.webButtonText}>현재 KO-PICK 웹 열기</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f6f8f7' },
  container: { paddingHorizontal: 24, paddingTop: 44, paddingBottom: 36 },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#e7f6ee',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  badgeText: { color: '#146b45', fontSize: 12, fontWeight: '800', letterSpacing: 0.7 },
  logo: { marginTop: 24, color: '#146b45', fontSize: 17, fontWeight: '900', letterSpacing: 1.2 },
  title: { marginTop: 8, color: '#17211c', fontSize: 32, fontWeight: '900', lineHeight: 40 },
  subtitle: { marginTop: 12, color: '#5d6862', fontSize: 16, lineHeight: 24 },
  connectionCard: {
    marginTop: 28,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: '#ffffff',
    padding: 18,
  },
  statusDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#d59623' },
  statusDotReady: { backgroundColor: '#1d9b67' },
  connectionCopy: { marginLeft: 12 },
  connectionTitle: { color: '#17211c', fontSize: 15, fontWeight: '800' },
  connectionText: { marginTop: 2, color: '#6b756f', fontSize: 13 },
  list: { marginTop: 18, gap: 12 },
  item: {
    flexDirection: 'row',
    borderRadius: 18,
    backgroundColor: '#ffffff',
    paddingHorizontal: 17,
    paddingVertical: 16,
  },
  itemNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#eef3f0',
    color: '#146b45',
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 30,
    textAlign: 'center',
  },
  itemCopy: { flex: 1, marginLeft: 13 },
  itemTitle: { color: '#17211c', fontSize: 15, fontWeight: '800' },
  itemDescription: { marginTop: 4, color: '#68736d', fontSize: 13, lineHeight: 19 },
  webButton: {
    marginTop: 24,
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#146b45',
    paddingVertical: 16,
  },
  webButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
});
