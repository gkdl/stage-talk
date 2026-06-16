import { Tabs } from 'expo-router';
import { Text, View, StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';

interface TabIconProps {
  emoji: string;
  label: string;
  focused: boolean;
}

function TabIcon({ emoji, label, focused }: TabIconProps) {
  return (
    <View style={styles.tabItem}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={[styles.label, focused ? styles.labelActive : styles.labelInactive]}>
        {label}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: 82,
          backgroundColor: colors.cardBackground,
          borderTopColor: colors.divider,
          borderTopWidth: 1,
          paddingBottom: 0,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🏠" label="홈" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="performances"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🎭" label="공연" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="actors"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="⭐" label="배우" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="records"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="📔" label="기록" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="👤" label="내 정보" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
  emoji: {
    fontSize: 20,
  },
  label: {
    fontSize: 10,
    marginTop: 2,
  },
  labelActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  labelInactive: {
    color: colors.textTertiary,
    fontWeight: '400',
  },
});
