import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useSession } from '@/context/session-context';
import { appConfig } from '@/lib/config';
import { supabase } from '@/lib/supabase';

function providerLabel(provider: unknown) {
  return ({ google: 'Google', kakao: '카카오', naver: '네이버', apple: 'Apple' } as Record<string, string>)[String(provider)] || '소셜';
}

const supportEmail = 'jjs092200@gmail.com';

function supportGmailUrl(type: 'inquiry' | 'feedback') {
  const isFeedback = type === 'feedback';
  const subject = isFeedback ? '[KO-PICK 테스트 피드백]' : '[KO-PICK 테스트 문의]';
  const body = isFeedback
    ? 'KO-PICK 테스트 중 느낀 점이나 개선 의견을 적어 주세요.\n\n사용 기기:\n의견:'
    : 'KO-PICK 이용 중 궁금한 점이나 문제를 적어 주세요.\n\n사용 기기:\n문의 내용:';
  return `https://mail.google.com/mail/?view=cm&fs=1&tf=1&to=${encodeURIComponent(supportEmail)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export default function AccountScreen() {
  const { loading, session } = useSession();

  const logout = async () => {
    await supabase.auth.signOut({ scope: 'local' });
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#146b45" /></View>;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.eyebrow}>MY KO-PICK</Text>
        <Text style={styles.title}>내 계정</Text>

        {session ? (
          <View style={styles.card}>
            <View style={styles.avatar}><Text style={styles.avatarText}>K</Text></View>
            <Text style={styles.name}>
              {session.user.user_metadata.full_name || session.user.user_metadata.name || 'KO-PICK 사용자'}
            </Text>
            <Text style={styles.email}>{session.user.email || '이메일 비공개 계정'}</Text>
            <Text style={styles.provider}>
              {providerLabel(session.user.app_metadata.provider)} 로그인 · 모바일 보안 세션
            </Text>
            <Pressable accessibilityRole="button" onPress={() => void logout()} style={styles.outlineButton}>
              <Text style={styles.outlineText}>로그아웃</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>로그인하고 장소를 저장하세요</Text>
            <Text style={styles.cardDescription}>카카오·네이버·Google·Apple 계정을 연결할 수 있습니다.</Text>
            <Pressable accessibilityRole="button" onPress={() => router.push('/login')} style={styles.loginButton}>
              <Text style={styles.loginText}>로그인 / 회원가입</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.links}>
          <Pressable onPress={() => void Linking.openURL(`${appConfig.webUrl}/terms`)}><Text style={styles.link}>이용약관</Text></Pressable>
          <Pressable onPress={() => void Linking.openURL(`${appConfig.webUrl}/privacy`)}><Text style={styles.link}>개인정보처리방침</Text></Pressable>
          <Pressable onPress={() => void Linking.openURL(`${appConfig.webUrl}/account-deletion`)}><Text style={styles.link}>회원탈퇴 안내</Text></Pressable>
          <Pressable onPress={() => void Linking.openURL(supportGmailUrl('inquiry'))}><Text style={styles.link}>문의 접수</Text></Pressable>
          <Pressable onPress={() => void Linking.openURL(supportGmailUrl('feedback'))}><Text style={styles.link}>피드백 보내기</Text></Pressable>
          <Pressable onPress={() => void Linking.openURL(`${appConfig.webUrl}/support`)}><Text style={styles.link}>고객지원 안내</Text></Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f8f6' },
  container: { paddingHorizontal: 18, paddingTop: 24, paddingBottom: 34 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f8f6' },
  eyebrow: { color: '#146b45', fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  title: { marginTop: 5, color: '#17211c', fontSize: 30, fontWeight: '900' },
  card: { marginTop: 22, alignItems: 'center', borderRadius: 24, backgroundColor: '#ffffff', padding: 24 },
  avatar: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center', borderRadius: 32, backgroundColor: '#146b45' },
  avatarText: { color: '#ffffff', fontSize: 24, fontWeight: '900' },
  name: { marginTop: 14, color: '#1b2821', fontSize: 20, fontWeight: '900' },
  email: { marginTop: 5, color: '#69756e', fontSize: 13 },
  provider: { marginTop: 8, color: '#146b45', fontSize: 12, fontWeight: '800' },
  cardTitle: { color: '#1b2821', fontSize: 20, fontWeight: '900', textAlign: 'center' },
  cardDescription: { marginTop: 8, color: '#69756e', fontSize: 13, lineHeight: 20, textAlign: 'center' },
  loginButton: { width: '100%', marginTop: 20, alignItems: 'center', borderRadius: 14, backgroundColor: '#146b45', paddingVertical: 15 },
  loginText: { color: '#ffffff', fontSize: 14, fontWeight: '900' },
  outlineButton: { width: '100%', marginTop: 22, alignItems: 'center', borderWidth: 1, borderColor: '#ccd8d1', borderRadius: 14, paddingVertical: 14 },
  outlineText: { color: '#3f4e45', fontSize: 14, fontWeight: '800' },
  links: { marginTop: 18, borderRadius: 20, backgroundColor: '#ffffff', paddingHorizontal: 18 },
  link: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e2e8e4', color: '#405047', fontSize: 14, fontWeight: '700', paddingVertical: 16 },
});
