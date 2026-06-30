import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';
import { goBack } from '@/utils/nav';

export interface LegalSection {
  h: string;
  b: string;
}

export function LegalLayout({ title, updatedAt, sections }: { title: string; updatedAt: string; sections: LegalSection[] }) {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.updated}>시행일 {updatedAt}</Text>
        {sections.map((s, i) => (
          <View key={i} style={styles.section}>
            <Text style={styles.h}>{s.h}</Text>
            <Text style={styles.b}>{s.b}</Text>
          </View>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cardBackground },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 48,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  backBtn: { fontSize: 20, color: colors.textPrimary, width: 40 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600', color: colors.textPrimary },
  content: { padding: 20 },
  updated: { fontSize: 12, color: colors.textTertiary, marginBottom: 20 },
  section: { marginBottom: 22 },
  h: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 },
  b: { fontSize: 13, lineHeight: 21, color: colors.textSecondary },
});
