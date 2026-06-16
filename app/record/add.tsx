import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '@/constants/theme';
import { useAddWatchLog } from '@/hooks/useWatchLogs';
import { usePerformances } from '@/hooks/usePerformances';
import { useDebounce } from '@/hooks/useDebounce';

export default function AddRecordScreen() {
  const router = useRouter();
  const { mutateAsync: addLog, isPending } = useAddWatchLog();

  const [searchInput, setSearchInput] = useState('');
  const [selectedPerf, setSelectedPerf] = useState<{ id: string; title: string } | null>(null);
  const [watchDate, setWatchDate] = useState('');
  const [seat, setSeat] = useState('');
  const [casting, setCasting] = useState('');
  const [rating, setRating] = useState(5);
  const [memo, setMemo] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const debouncedSearch = useDebounce(searchInput, 400);
  const { data: perfPages } = usePerformances('', debouncedSearch);
  const searchResults = perfPages?.pages.flatMap((p) => p.items).slice(0, 8) ?? [];

  const handleSubmit = async () => {
    if (!selectedPerf) return Alert.alert('공연을 선택해주세요');
    if (!watchDate.trim()) return Alert.alert('관람 날짜를 입력해주세요');

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(watchDate.trim())) {
      return Alert.alert('날짜 형식을 확인해주세요 (YYYY-MM-DD)');
    }

    try {
      await addLog({
        performance_id: selectedPerf.id,
        watch_date: watchDate.trim(),
        seat: seat.trim() || undefined,
        casting: casting.trim() || undefined,
        rating,
        memo: memo.trim() || undefined,
      });
      router.back();
    } catch {
      Alert.alert('저장 실패', '잠시 후 다시 시도해주세요');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancelText}>취소</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>관람 기록 추가</Text>
        <TouchableOpacity onPress={handleSubmit} disabled={isPending}>
          <Text style={[styles.saveText, isPending && styles.saveDisabled]}>저장</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
          <View style={styles.section}>
            <Text style={styles.label}>공연 *</Text>
            {selectedPerf ? (
              <TouchableOpacity
                style={styles.selectedPerf}
                onPress={() => { setSelectedPerf(null); setShowSearch(true); }}
              >
                <Text style={styles.selectedPerfText}>{selectedPerf.title}</Text>
                <Text style={styles.changeBtnText}>변경</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="공연명으로 검색"
                  placeholderTextColor={colors.textTertiary}
                  value={searchInput}
                  onChangeText={(v) => { setSearchInput(v); setShowSearch(true); }}
                  onFocus={() => setShowSearch(true)}
                />
                {showSearch && searchResults.length > 0 && (
                  <View style={styles.searchDropdown}>
                    {searchResults.map((p) => (
                      <TouchableOpacity
                        key={p.id}
                        style={styles.searchItem}
                        onPress={() => {
                          setSelectedPerf({ id: p.id, title: p.title });
                          setSearchInput('');
                          setShowSearch(false);
                        }}
                      >
                        <Text style={styles.searchItemText}>{p.title}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            )}
          </View>

          <View style={styles.divider} />

          <View style={styles.section}>
            <Text style={styles.label}>관람 날짜 *</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textTertiary}
              value={watchDate}
              onChangeText={setWatchDate}
              keyboardType="numeric"
              maxLength={10}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.section}>
            <Text style={styles.label}>별점</Text>
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((s) => (
                <TouchableOpacity key={s} onPress={() => setRating(s)}>
                  <Text style={[styles.starBtn, s <= rating && styles.starBtnActive]}>
                    {s <= rating ? '★' : '☆'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.section}>
            <Text style={styles.label}>좌석</Text>
            <TextInput
              style={styles.input}
              placeholder="예: VIP 1열 12번"
              placeholderTextColor={colors.textTertiary}
              value={seat}
              onChangeText={setSeat}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.section}>
            <Text style={styles.label}>캐스팅</Text>
            <TextInput
              style={styles.input}
              placeholder="예: 홍광호·민우혁"
              placeholderTextColor={colors.textTertiary}
              value={casting}
              onChangeText={setCasting}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.section}>
            <Text style={styles.label}>한줄 메모</Text>
            <TextInput
              style={[styles.input, styles.memoInput]}
              placeholder="오늘 공연의 한줄 소감을 남겨보세요"
              placeholderTextColor={colors.textTertiary}
              value={memo}
              onChangeText={setMemo}
              multiline
              maxLength={200}
            />
          </View>

          <View style={{ height: 60 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cardBackground },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 48,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  cancelText: { fontSize: 15, color: colors.textSecondary },
  headerTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  saveText: { fontSize: 15, fontWeight: '600', color: colors.primary },
  saveDisabled: { opacity: 0.4 },

  section: { paddingHorizontal: 16, paddingVertical: 14 },
  label: { fontSize: 12, color: colors.textSecondary, marginBottom: 8 },

  input: {
    fontSize: 15,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  memoInput: { minHeight: 80, textAlignVertical: 'top' },

  selectedPerf: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selectedPerfText: { fontSize: 15, color: colors.textPrimary, flex: 1 },
  changeBtnText: { fontSize: 13, color: colors.primary, fontWeight: '500' },

  searchDropdown: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: 8,
    overflow: 'hidden',
  },
  searchItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  searchItemText: { fontSize: 14, color: colors.textPrimary },

  starRow: { flexDirection: 'row', gap: 8 },
  starBtn: { fontSize: 28, color: colors.divider },
  starBtnActive: { color: '#F59E0B' },

  divider: { height: 1, backgroundColor: colors.divider },
});
