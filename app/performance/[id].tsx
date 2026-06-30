import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Calendar } from 'react-native-calendars';
import { supabase } from '@/lib/supabase';
import { colors } from '@/constants/theme';
import { Performance } from '@/types/database';
import PostListItem from '@/components/PostListItem';
import { usePerformancePosts } from '@/hooks/usePerformancePosts';
import { useCastings, useCastingsByDate, useAddCasting } from '@/hooks/useCastings';
import { useBookmark } from '@/hooks/useBookmark';
import { useAuthStore } from '@/store/authStore';
import { dedupeById } from '@/utils/dedupeById';

type MainTab = 'board' | 'casting' | 'info';
type SortTab = 'popular' | 'recent';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  return `${d}일 전`;
}

function formatDate(d: string) {
  return d ? d.replace(/-/g, '.') : '';
}

function genreLabel(g: string) {
  return g === 'musical' ? '뮤지컬' : '연극';
}

// ─── 게시판 탭 ───────────────────────────────────────────
function BoardTab({ performanceId }: { performanceId: string }) {
  const router = useRouter();
  const [sort, setSort] = useState<SortTab>('popular');
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch, isRefetching } =
    usePerformancePosts(performanceId, sort);

  const posts = dedupeById(data?.pages.flat() ?? []);

  const tagMap: Record<string, string[]> = {
    '후기(스포있음)': ['후기', '스포있음'],
    '후기(스포없음)': ['후기', '스포없음'],
  };

  return (
    <View style={{ flex: 1 }}>
      {/* 인기글 / 최신글 서브탭 */}
      <View style={styles.subTabRow}>
        {(['popular', 'recent'] as SortTab[]).map((s) => (
          <TouchableOpacity key={s} onPress={() => setSort(s)} style={styles.subTab}>
            <Text style={[styles.subTabText, sort === s && styles.subTabTextActive]}>
              {s === 'popular' ? '인기글' : '최신글'}
            </Text>
            {sort === s && <View style={styles.subTabUnderline} />}
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.divider} />

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const extraTags = tagMap[item.tag];
            return (
              <PostListItem
                boardLabel={item.tag}
                tag={extraTags ? extraTags[0] : item.tag}
                extraTags={extraTags ? [extraTags[1]] : undefined}
                title={item.title}
                author={(item as any).profiles?.nickname ?? '알 수 없음'}
                timeAgo={timeAgo(item.created_at)}
                likesCount={item.likes_count}
                commentsCount={item.comments_count}
                onPress={() => router.push(`/post/${item.id}` as never)}
              />
            );
          }}
          onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>아직 게시글이 없어요</Text>
            </View>
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />
            ) : null
          }
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* 글쓰기 FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push(`/write?performanceId=${performanceId}` as never)}
      >
        <Text style={styles.fabIcon}>✏️</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── 캐스팅 등록 모달 ───────────────────────────────────
interface AddCastingModalProps {
  visible: boolean;
  performanceId: string;
  selectedDate: string;
  onClose: () => void;
}

function AddCastingModal({ visible, performanceId, selectedDate, onClose }: AddCastingModalProps) {
  const user = useAuthStore((s) => s.user);
  const { mutate: addCasting, isPending } = useAddCasting();
  const [timeSlot, setTimeSlot] = useState<'14:00' | '19:30' | 'other'>('14:00');
  const [roles, setRoles] = useState([{ role: '', actor: '' }]);

  const addRole = () => setRoles((r) => [...r, { role: '', actor: '' }]);
  const removeRole = (i: number) => setRoles((r) => r.filter((_, idx) => idx !== i));
  const updateRole = (i: number, field: 'role' | 'actor', value: string) => {
    setRoles((r) => r.map((item, idx) => (idx === i ? { ...item, [field]: value } : item)));
  };

  const handleSubmit = () => {
    if (!user) return Alert.alert('로그인이 필요합니다');
    const validRoles = roles.filter((r) => r.role.trim() && r.actor.trim());
    if (validRoles.length === 0) return Alert.alert('역할과 배우를 입력해주세요');
    addCasting(
      { performance_id: performanceId, cast_date: selectedDate, time_slot: timeSlot, roles: validRoles, reported_by: user.id },
      { onSuccess: onClose },
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.cardBackground }} edges={['top']}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.modalCancel}>취소</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>캐스팅 등록</Text>
          <TouchableOpacity onPress={handleSubmit} disabled={isPending}>
            <Text style={[styles.modalDone, isPending && { opacity: 0.5 }]}>등록</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1, padding: 16 }}>
          <Text style={styles.modalLabel}>날짜</Text>
          <Text style={styles.modalValue}>{selectedDate}</Text>

          <Text style={styles.modalLabel}>회차</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            {(['14:00', '19:30', 'other'] as const).map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.slotPill, timeSlot === s && styles.slotPillActive]}
                onPress={() => setTimeSlot(s)}
              >
                <Text style={[styles.slotText, timeSlot === s && { color: '#fff' }]}>
                  {s === 'other' ? '기타' : s}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.modalLabel}>역할 · 배우</Text>
          {roles.map((r, i) => (
            <View key={i} style={styles.roleRow}>
              <TextInput
                style={[styles.roleInput, { flex: 1 }]}
                placeholder="역할명"
                placeholderTextColor={colors.textTertiary}
                value={r.role}
                onChangeText={(v) => updateRole(i, 'role', v)}
              />
              <TextInput
                style={[styles.roleInput, { flex: 1 }]}
                placeholder="배우명"
                placeholderTextColor={colors.textTertiary}
                value={r.actor}
                onChangeText={(v) => updateRole(i, 'actor', v)}
              />
              {roles.length > 1 && (
                <TouchableOpacity onPress={() => removeRole(i)} style={{ padding: 8 }}>
                  <Text style={{ color: colors.danger, fontSize: 16 }}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
          <TouchableOpacity onPress={addRole} style={styles.addRoleBtn}>
            <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '500' }}>+ 역할 추가</Text>
          </TouchableOpacity>

          <View style={styles.noticeBanner}>
            <Text style={styles.noticeText}>팬 제보 기반 정보입니다. 공식 정보와 다를 수 있어요.</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── 캐스팅 캘린더 탭 ──────────────────────────────────
function CastingCalendarTab({ performanceId }: { performanceId: string }) {
  const [selectedDate, setSelectedDate] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const { data: allCastings } = useCastings(performanceId);
  const { data: dateCastings } = useCastingsByDate(performanceId, selectedDate);

  const markedDates = useMemo(() => {
    const marks: Record<string, any> = {};
    (allCastings ?? []).forEach((c) => {
      marks[c.cast_date] = {
        marked: true,
        dotColor: colors.primary,
        ...(c.cast_date === selectedDate ? { selected: true, selectedColor: colors.primary } : {}),
      };
    });
    if (selectedDate && !marks[selectedDate]) {
      marks[selectedDate] = { selected: true, selectedColor: colors.primary };
    }
    return marks;
  }, [allCastings, selectedDate]);

  return (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      {/* 팬 제보 안내 배너 */}
      <View style={styles.noticeBanner}>
        <Text style={styles.noticeText}>⚠️  팬 제보 기반 정보예요. 공식 정보와 다를 수 있어요.</Text>
      </View>

      {/* 캘린더 */}
      <Calendar
        onDayPress={(day) => setSelectedDate(day.dateString)}
        markedDates={markedDates}
        theme={{
          selectedDayBackgroundColor: colors.primary,
          todayTextColor: colors.primary,
          arrowColor: colors.primary,
          dotColor: colors.primary,
          textDayFontSize: 13,
          textMonthFontSize: 15,
          textMonthFontWeight: '600',
          textDayHeaderFontSize: 12,
          calendarBackground: colors.cardBackground,
        }}
        style={{ marginBottom: 8 }}
      />

      <View style={[styles.divider, { marginBottom: 12 }]} />

      {/* 선택된 날짜 캐스팅 */}
      {selectedDate ? (
        <View style={{ paddingHorizontal: 20 }}>
          <Text style={styles.castDateTitle}>
            {selectedDate.replace(/-/g, '.')} 캐스팅
          </Text>
          {(dateCastings ?? []).length === 0 ? (
            <Text style={[styles.emptyText, { marginTop: 12 }]}>등록된 캐스팅 정보가 없어요</Text>
          ) : (
            (dateCastings ?? []).map((c) => (
              <View key={c.id} style={styles.castCard}>
                <View style={styles.castCardHeader}>
                  <Text style={styles.castSlot}>{c.time_slot === 'other' ? '기타 회차' : `${c.time_slot} 공연`}</Text>
                  <TouchableOpacity style={styles.editPill} onPress={() => setShowAddModal(true)}>
                    <Text style={styles.editPillText}>제보 수정</Text>
                  </TouchableOpacity>
                </View>
                {(c.roles as { role: string; actor: string }[]).map((r, i) => (
                  <View key={i} style={styles.castRoleRow}>
                    <Text style={styles.castRoleLabel}>{r.role}</Text>
                    <Text style={styles.castActorName}>{r.actor}</Text>
                  </View>
                ))}
              </View>
            ))
          )}
        </View>
      ) : (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>날짜를 선택하면 캐스팅 정보를 볼 수 있어요</Text>
        </View>
      )}

      {/* 캐스팅 등록 버튼 */}
      <TouchableOpacity
        style={styles.addCastBtn}
        onPress={() => setShowAddModal(true)}
      >
        <Text style={styles.addCastBtnText}>+ 캐스팅 정보 등록하기</Text>
      </TouchableOpacity>

      <AddCastingModal
        visible={showAddModal}
        performanceId={performanceId}
        selectedDate={selectedDate}
        onClose={() => setShowAddModal(false)}
      />
    </ScrollView>
  );
}

// ─── 공연 정보 탭 ────────────────────────────────────────
function InfoTab({ performance }: { performance: Performance | null }) {
  if (!performance) return null;
  const rows = [
    { label: '공연장', value: performance.venue },
    { label: '공연 기간', value: `${formatDate(performance.start_date)} ~ ${formatDate(performance.end_date)}` },
    { label: '장르', value: genreLabel(performance.genre) },
    { label: '공연 상태', value: performance.status === 'ongoing' ? '공연중' : performance.status === 'upcoming' ? '개막예정' : '종료' },
  ];
  return (
    <ScrollView style={{ flex: 1, padding: 16 }}>
      {rows.map((r) => (
        <View key={r.label} style={styles.infoRow}>
          <Text style={styles.infoLabel}>{r.label}</Text>
          <Text style={styles.infoValue}>{r.value}</Text>
        </View>
      ))}
      <Text style={styles.kopisNote}>KOPIS 공연예술통합전산망 기준 정보입니다.</Text>
    </ScrollView>
  );
}

// ─── 메인 화면 ──────────────────────────────────────────
export default function PerformanceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<MainTab>('board');
  const { isBookmarked, toggleBookmark } = useBookmark(id);

  const { data: performance } = useQuery({
    queryKey: ['performance', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('performances')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Performance;
    },
    enabled: !!id,
  });

  const TABS: { key: MainTab; label: string }[] = [
    { key: 'board', label: '게시판' },
    { key: 'casting', label: '캐스팅 캘린더' },
    { key: 'info', label: '공연 정보' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {performance?.title ?? ''}
        </Text>
        <TouchableOpacity style={styles.bookmarkBtn} onPress={toggleBookmark}>
          <Text style={styles.bookmarkText}>{isBookmarked ? '♥  관심 등록됨' : '♡  관심 등록'}</Text>
        </TouchableOpacity>
      </View>

      {/* 공연 정보 한 줄 */}
      <View style={styles.subInfoRow}>
        <Text style={styles.subInfo}>
          {[performance?.venue, performance ? `${formatDate(performance.start_date)} ~ ${formatDate(performance.end_date)}` : '', performance ? genreLabel(performance.genre) : ''].filter(Boolean).join('  ·  ')}
        </Text>
      </View>
      <View style={styles.divider} />

      {/* 메인 탭 */}
      <View style={styles.mainTabRow}>
        {TABS.map((t) => (
          <TouchableOpacity key={t.key} onPress={() => setActiveTab(t.key)} style={styles.mainTab}>
            <Text style={[styles.mainTabText, activeTab === t.key && styles.mainTabTextActive]}>
              {t.label}
            </Text>
            {activeTab === t.key && <View style={styles.mainTabUnderline} />}
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.divider} />

      {/* 탭 콘텐츠 */}
      <View style={{ flex: 1 }}>
        {activeTab === 'board' && <BoardTab performanceId={id} />}
        {activeTab === 'casting' && <CastingCalendarTab performanceId={id} />}
        {activeTab === 'info' && <InfoTab performance={performance ?? null} />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    height: 48,
    paddingHorizontal: 16,
  },
  backBtn: { marginRight: 8 },
  backArrow: { fontSize: 20, color: colors.textPrimary },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  bookmarkBtn: {
    backgroundColor: colors.primaryLight,
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  bookmarkText: { fontSize: 12, fontWeight: '500', color: colors.primary },

  subInfoRow: {
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  subInfo: { fontSize: 11, color: colors.textTertiary },

  divider: { height: 1, backgroundColor: colors.divider },

  mainTabRow: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 16,
  },
  mainTab: {
    marginRight: 24,
    paddingVertical: 12,
    position: 'relative',
  },
  mainTabText: { fontSize: 13, color: colors.textSecondary },
  mainTabTextActive: { fontWeight: '600', color: colors.primary },
  mainTabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.primary,
    borderRadius: 1,
  },

  subTabRow: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 16,
  },
  subTab: {
    marginRight: 20,
    paddingVertical: 10,
    position: 'relative',
  },
  subTabText: { fontSize: 12, color: colors.textSecondary },
  subTabTextActive: { fontWeight: '600', color: colors.primary },
  subTabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.primary,
    borderRadius: 1,
  },

  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  fabIcon: { fontSize: 22 },

  noticeBanner: {
    margin: 16,
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    padding: 10,
  },
  noticeText: { fontSize: 11, color: '#92400E' },

  castDateTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  castCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  castCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  castSlot: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  editPill: {
    backgroundColor: '#F3F4F6',
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  editPillText: { fontSize: 11, fontWeight: '500', color: colors.textSecondary },
  castRoleRow: { flexDirection: 'row', marginBottom: 6 },
  castRoleLabel: { fontSize: 12, color: colors.textSecondary, width: 70 },
  castActorName: { fontSize: 13, fontWeight: '500', color: colors.textPrimary },

  addCastBtn: {
    margin: 20,
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  addCastBtnText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },

  emptyWrap: { paddingVertical: 48, alignItems: 'center' },
  emptyText: { fontSize: 14, color: colors.textTertiary },

  infoRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  infoLabel: { width: 80, fontSize: 13, color: colors.textSecondary },
  infoValue: { flex: 1, fontSize: 13, color: colors.textPrimary },
  kopisNote: { marginTop: 16, fontSize: 11, color: colors.textTertiary },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  modalCancel: { fontSize: 15, color: colors.textSecondary },
  modalTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  modalDone: { fontSize: 15, fontWeight: '600', color: colors.primary },
  modalLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 6, marginTop: 16 },
  modalValue: { fontSize: 14, color: colors.textPrimary, marginBottom: 4 },

  slotPill: {
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.cardBackground,
  },
  slotPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  slotText: { fontSize: 13, color: colors.textSecondary },

  roleRow: { flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'center' },
  roleInput: {
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: colors.cardBackground,
  },
  addRoleBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    marginBottom: 16,
  },
});
