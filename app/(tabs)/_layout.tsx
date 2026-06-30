import { Tabs } from 'expo-router';
import { Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';
import { AdBanner } from '@/components/AdBanner';

const TAB_META: Record<string, { emoji: string; label: string }> = {
  index: { emoji: '🏠', label: '홈' },
  performances: { emoji: '🎭', label: '공연' },
  actors: { emoji: '⭐', label: '배우' },
  records: { emoji: '📔', label: '기록' },
  profile: { emoji: '👤', label: '내 정보' },
};

// expo-router가 넘겨주는 props만 사용 (@react-navigation 직접 import는 SDK56에서 불가)
function CustomTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  return (
    <View>
      {/* 탭 바 위 하단 광고 배너 (웹에서는 렌더 안 됨) */}
      <AdBanner />
      <View style={[styles.tabBar, { paddingBottom: insets.bottom }]}>
        {state.routes.map((route: any, index: number) => {
          const focused = state.index === index;
          const meta = TAB_META[route.name] ?? { emoji: '', label: route.name };
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };
          return (
            <TouchableOpacity key={route.key} style={styles.tabButton} onPress={onPress} activeOpacity={0.7}>
              <Text style={styles.emoji}>{meta.emoji}</Text>
              <Text style={[styles.label, focused ? styles.labelActive : styles.labelInactive]}>
                {meta.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs tabBar={(props) => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="performances" />
      <Tabs.Screen name="actors" />
      <Tabs.Screen name="records" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    height: 64,
    backgroundColor: colors.cardBackground,
    borderTopColor: colors.divider,
    borderTopWidth: 1,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
  emoji: { fontSize: 20 },
  label: { fontSize: 10, marginTop: 2 },
  labelActive: { color: colors.primary, fontWeight: '600' },
  labelInactive: { color: colors.textTertiary, fontWeight: '400' },
});
