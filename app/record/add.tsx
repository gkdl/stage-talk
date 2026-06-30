import { useState, useEffect } from 'react';
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
import { dedupeById } from '@/utils/dedupeById';
import { resolveActorId, searchActors } from '@/lib/actors';

export default function AddRecordScreen() {
  const router = useRouter();
  const { mutateAsync: addLog, isPending } = useAddWatchLog();

  const [searchInput, setSearchInput] = useState('');
  const [selectedPerf, setSelectedPerf] = useState<{ id: string; title: string } | null>(null);
  const [watchDate, setWatchDate] = useState('');
  const [seat, setSeat] = useState('');
  const [rating, setRating] = useState(5);
  const [memo, setMemo] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // 배우 다중 선택
  const [pickedActors, setPickedActors] = useState<{ id: string; name: string }[]>([]);
  const [actorInput, setActorInput] = useState('');
  const [actorSuggestions, setActorSuggestions] = useState<{ id: string; name: string }[]>([]);
  const [addingActor, setAddingActor] = useState(false);
  const debouncedActor = useDebounce(actorInput, 300);

  const debouncedSearch = useDebounce(searchInput, 400);
  const { data: perfPages } = usePerformances('all', 'all', 'imminent', debouncedSearch);
  const searchResults = dedupeById(perfPages?.pages.flat() ?? []).slice(0, 8);

  useEffect(() => {
    let active = true;
    const q = debouncedActor.trim();
    if (!q) {
      setActorSuggestions([]);
      return;
    }
    searchActors(q).then((list) => {
      if (active) setActorSuggestions(list.filter((s) => !pickedActors.some((p) => p.id === s.id)));
    });
    return () => {
      active = false;
    };
  }, [debouncedActor, pickedActors]);

  const addActor = (actor: { id: string; name: string }) => {
    if (pickedActors.some((p) => p.id === actor.id)) return;
    setPickedActors((prev) => [...prev, actor]);
    setActorInput('');
    setActorSuggestions([]);
  };

  const addTypedActor = async () => {
    const name = actorInput.trim();
    if (!name || addingActor) return;
    setAddingActor(true);
    try {
      const id = await resolveActorId(name);
      if (id) addActor({ id, name });
    } catch {
      Alert.alert('배우 추가 실패', '잠시 후 다시 시도해주세요');
    } finally {
      setAddingActor(false);
    }
  };

  const removeActor = (id: string) => {
    setPickedActors((prev) => prev.filter((p) => p.id !== id));
  };

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
        // 표시용 캐스팅 문자열은 선택한 배우 이름으로 구성
        casting: pickedActors.length > 0 ? pickedActors.map((a) => a.name).join(', ') : undefined,
        actor_ids: pickedActors.map((a) => a.id),
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
            <Text style={styles.label}>본 배우 (최애 배우 집계에 사용돼요)</Text>

            {/* 선택된 배우 칩 */}
            {pickedActors.length > 0 && (
              <View style={styles.chipRow}>
                {pickedActors.map((a) => (
                  <View key={a.id} style={styles.chip}>
                    <Text style={styles.chipText}>{a.name}</Text>
                    <TouchableOpacity onPress={() => removeActor(a.id)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                      <Text style={styles.chipRemove}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.actorInputRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="배우 이름 입력 후 추가 (없으면 새로 등록)"
                placeholderTextColor={colors.textTertiary}
                value={actorInput}
                onChangeText={setActorInput}
                onSubmitEditing={addTypedActor}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={[styles.addActorBtn, (!actorInput.trim() || addingActor) && styles.addActorBtnDisabled]}
                onPress={addTypedActor}
                disabled={!actorInput.trim() || addingActor}
              >
                <Text style={styles.addActorBtnText}>추가</Text>
              </TouchableOpacity>
            </View>

            {actorSuggestions.length > 0 && (
              <View style={styles.searchDropdown}>
                {actorSuggestions.map((s) => (
                  <TouchableOpacity key={s.id} style={styles.searchItem} onPress={() => addActor(s)}>
                    <Text style={styles.searchItemText}>{s.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
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

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryLight ?? '#EDE9FE',
    borderRadius: 100,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 6,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  chipRemove: { fontSize: 11, color: colors.primary, fontWeight: '700' },
  actorInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addActorBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  addActorBtnDisabled: { opacity: 0.4 },
  addActorBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },

  divider: { height: 1, backgroundColor: colors.divider },
});
