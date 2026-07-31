import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { signInWithAppleNative } from '@/lib/apple-auth';
import { signInWithNaver, signInWithSupabaseOAuth, type MobileAuthProvider } from '@/lib/auth';
import { appConfig } from '@/lib/config';

function ConsentRow({
  checked,
  label,
  onChange,
  onOpen,
}: {
  checked: boolean;
  label: string;
  onChange: () => void;
  onOpen: () => void;
}) {
  return (
    <View style={styles.consentRow}>
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={onChange} style={[styles.checkbox, checked && styles.checkboxChecked]}>
        <Text style={styles.checkmark}>{checked ? '✓' : ''}</Text>
      </Pressable>
      <Pressable onPress={onChange} style={styles.consentCopy}>
        <Text style={styles.consentText}>[필수] {label}에 동의합니다.</Text>
      </Pressable>
      <Pressable onPress={onOpen}><Text style={styles.openText}>보기</Text></Pressable>
    </View>
  );
}

export default function LoginScreen() {
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [active, setActive] = useState<MobileAuthProvider | null>(null);
  const [message, setMessage] = useState('');
  const ready = terms && privacy && !active;

  const login = async (provider: MobileAuthProvider) => {
    if (!terms || !privacy || active) {
      setMessage('이용약관과 개인정보 수집·이용에 각각 동의해 주세요.');
      return;
    }
    setActive(provider);
    setMessage('로그인 페이지를 연결하고 있어요.');
    try {
      if (provider === 'naver') {
        await signInWithNaver();
      } else if (provider === 'apple' && Platform.OS === 'ios') {
        await signInWithAppleNative();
      } else {
        await signInWithSupabaseOAuth(provider);
      }
      router.replace('/(tabs)/account');
    } catch (error) {
      const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
      setMessage(code === 'ERR_REQUEST_CANCELED'
        ? '로그인이 취소되었습니다.'
        : error instanceof Error ? error.message : '로그인에 실패했습니다.');
    } finally {
      setActive(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()}><Text style={styles.back}>← 돌아가기</Text></Pressable>
        <Text style={styles.brand}>KO-PICK</Text>
        <Text style={styles.title}>다시 만나서 반가워요</Text>
        <Text style={styles.subtitle}>로그인하고 저장한 장소와 맞춤 추천을 이어서 확인하세요.</Text>

        <View style={styles.card}>
          <ConsentRow
            checked={terms}
            label="이용약관"
            onChange={() => setTerms((value) => !value)}
            onOpen={() => void Linking.openURL(`${appConfig.webUrl}/terms`)}
          />
          <ConsentRow
            checked={privacy}
            label="개인정보 수집·이용"
            onChange={() => setPrivacy((value) => !value)}
            onOpen={() => void Linking.openURL(`${appConfig.webUrl}/privacy`)}
          />

          <Text style={styles.quick}>5초 만에 빠른 회원가입</Text>
          <Pressable disabled={!ready} onPress={() => void login('kakao')} style={[styles.provider, styles.kakao, !ready && styles.disabled]}>
            <Text style={styles.kakaoText}>{active === 'kakao' ? '카카오 연결 중...' : '●  카카오로 시작'}</Text>
          </Pressable>
          <Pressable disabled={!ready} onPress={() => void login('naver')} style={[styles.provider, styles.naver, !ready && styles.disabled]}>
            <Text style={styles.providerText}>{active === 'naver' ? '네이버 연결 중...' : 'N  네이버로 로그인'}</Text>
          </Pressable>
          <Pressable disabled={!ready} onPress={() => void login('google')} style={[styles.provider, styles.google, !ready && styles.disabled]}>
            <Text style={styles.googleText}>{active === 'google' ? 'Google 연결 중...' : 'G  Google로 로그인'}</Text>
          </Pressable>
          {Platform.OS === 'ios' ? (
            <Pressable disabled={!ready} onPress={() => void login('apple')} style={[styles.provider, styles.apple, !ready && styles.disabled]}>
              <Text style={styles.providerText}>{active === 'apple' ? 'Apple 연결 중...' : '  Apple로 로그인'}</Text>
            </Pressable>
          ) : null}

          {message ? <Text style={[styles.message, active && styles.status]}>{message}</Text> : null}
          {!appConfig.isSupabaseConfigured ? (
            <Text style={styles.configWarning}>앱 빌드 전에 Supabase 공개 환경변수를 설정해 주세요.</Text>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f8f6' },
  container: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 36 },
  back: { color: '#526159', fontSize: 14, fontWeight: '700' },
  brand: { marginTop: 34, color: '#146b45', fontSize: 16, fontWeight: '900', letterSpacing: 1.2 },
  title: { marginTop: 8, color: '#17211c', fontSize: 29, fontWeight: '900' },
  subtitle: { marginTop: 9, color: '#66716b', fontSize: 14, lineHeight: 21 },
  card: { marginTop: 24, borderRadius: 24, backgroundColor: '#ffffff', padding: 20 },
  consentRow: { marginTop: 12, flexDirection: 'row', alignItems: 'center' },
  checkbox: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#b8c4bd', borderRadius: 6 },
  checkboxChecked: { borderColor: '#146b45', backgroundColor: '#146b45' },
  checkmark: { color: '#ffffff', fontSize: 13, fontWeight: '900' },
  consentCopy: { flex: 1, paddingHorizontal: 9 },
  consentText: { color: '#39473f', fontSize: 13, lineHeight: 18 },
  openText: { color: '#146b45', fontSize: 12, fontWeight: '800' },
  quick: { marginTop: 24, marginBottom: 9, color: '#3c4942', fontSize: 12, fontWeight: '800', textAlign: 'center' },
  provider: { marginTop: 10, alignItems: 'center', borderRadius: 14, paddingVertical: 15 },
  kakao: { backgroundColor: '#fee500' },
  naver: { backgroundColor: '#03c75a' },
  google: { borderWidth: 1, borderColor: '#d8dfdb', backgroundColor: '#ffffff' },
  apple: { backgroundColor: '#000000' },
  disabled: { opacity: 0.42 },
  providerText: { color: '#ffffff', fontSize: 15, fontWeight: '900' },
  kakaoText: { color: '#191919', fontSize: 15, fontWeight: '900' },
  googleText: { color: '#26332c', fontSize: 15, fontWeight: '900' },
  message: { marginTop: 14, color: '#a43232', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  status: { color: '#146b45' },
  configWarning: { marginTop: 12, color: '#8a6512', fontSize: 12, lineHeight: 18, textAlign: 'center' },
});
