import { Tabs } from 'expo-router';
import { Text } from 'react-native';

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text style={{ color: focused ? '#146b45' : '#879089', fontSize: 18, fontWeight: '900' }}>
      {label}
    </Text>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#146b45',
        tabBarInactiveTintColor: '#879089',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '800' },
        tabBarStyle: { height: 66, paddingTop: 6, paddingBottom: 8 },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '추천',
          tabBarIcon: ({ focused }) => <TabIcon label="K" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: '장소 찾기',
          tabBarIcon: ({ focused }) => <TabIcon label="⌖" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: '내 계정',
          tabBarIcon: ({ focused }) => <TabIcon label="●" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
