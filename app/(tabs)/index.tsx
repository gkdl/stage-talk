import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>관극</Text>
        <View style={styles.bellButton}>
          <Text style={styles.bellEmoji}>🔔</Text>
        </View>
      </View>
      <View style={styles.content}>
        <Text style={styles.placeholder}>홈 피드 (STEP 8에서 구현)</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.cardBackground,
    height: 48,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  bellButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellEmoji: { fontSize: 16 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  placeholder: { color: colors.textSecondary, fontSize: 14 },
});
