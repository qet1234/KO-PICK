import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text } from 'react-native';

import { completeMobileAuthUrl } from '@/lib/auth';

export default function AuthCallbackScreen() {
  const incomingUrl = Linking.useURL();
  const [message, setMessage] = useState('로그인을 완료하고 있어요.');

  useEffect(() => {
    let cancelled = false;
    const complete = async () => {
      const url = incomingUrl || await Linking.getInitialURL();
      if (!url) {
        setMessage('로그인 인증 주소를 확인하지 못했습니다.');
        return;
      }
      try {
        await completeMobileAuthUrl(url);
        if (!cancelled) router.replace('/(tabs)/account');
      } catch (error) {
        if (!cancelled) setMessage(error instanceof Error ? error.message : '로그인을 완료하지 못했습니다.');
      }
    };
    void complete();
    return () => { cancelled = true; };
  }, [incomingUrl]);

  return (
    <SafeAreaView style={styles.container}>
      <ActivityIndicator color="#146b45" size="large" />
      <Text style={styles.message}>{message}</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f8f6', padding: 24 },
  message: { marginTop: 16, color: '#34423a', fontSize: 15, lineHeight: 22, textAlign: 'center' },
});
