import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';

export default function PerformanceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backText}>← 뒤로</Text>
      </TouchableOpacity>
      <View style={styles.content}>
        <Text style={styles.text}>공연 상세</Text>
        <Text style={styles.sub}>{id}</Text>
        <Text style={styles.sub}>(STEP 4에서 구현)</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  backBtn: { padding: 16 },
  backText: { fontSize: 15, color: colors.primary },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 16, color: colors.textPrimary, fontWeight: '600' },
  sub: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
});
