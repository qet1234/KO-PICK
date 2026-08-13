import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text } from 'react-native';

import { authCallbackUrlFromRouteParams } from '@/lib/auth-callback-url';
import { completeMobileAuthUrl } from '@/lib/auth';

export default function AuthCallbackScreen() {
  const incomingUrl = Linking.useURL();
  const routeParams = useLocalSearchParams<
    Record<string, string | string[] | undefined>
  >();
  const routedAuthUrl = authCallbackUrlFromRouteParams(routeParams);
  const [message, setMessage] = useState('로그인을 완료하고 있어요.');

  useEffect(() => {
    let cancelled = false;

    const complete = async () => {
      const url = routedAuthUrl || incomingUrl || (await Linking.getInitialURL());

      if (!url) {
        setMessage('로그인 인증 주소를 확인하지 못했습니다.');
        return;
      }

      try {
        await completeMobileAuthUrl(url);
        if (!cancelled) router.replace('/(tabs)/account');
      } catch (error) {
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : '로그인을 완료하지 못했습니다.');
        }
      }
    };

    void complete();

    return () => {
      cancelled = true;
    };
  }, [incomingUrl, routedAuthUrl]);

  return (
    <SafeAreaView style={styles.container}>
      <ActivityIndicator color="#ff3b36" size="large" />
      <Text style={styles.message}>{message}</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f7f7f4', padding: 24 },
  message: { marginTop: 16, color: '#454541', fontSize: 15, lineHeight: 22, textAlign: 'center' },
});
