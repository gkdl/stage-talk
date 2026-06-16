import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';

export default function PostDetailScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.text}>게시글 상세: {postId}</Text>
        <Text style={styles.sub}>(STEP 6에서 구현)</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 16, color: colors.textPrimary },
  sub: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
});
