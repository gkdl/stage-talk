import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '@/constants/theme';
import { useWatchLogs, useWatchLogStats, useDeleteWatchLog, StatsPeriod } from '@/hooks/useWatchLogs';
import { useAuthStore } from '@/store/authStore';

type GenreFilter = 'all' | 'musical' | 'play';

const GENRE_TABS: { key: GenreFilter; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'musical', label: '뮤지컬' },
  { key: 'play', label: '연극' },
];

function StarRating({ rating }: { rating: number | null }) {
  const r = rating ?? 0;
  const stars = '★'.repeat(Math.round(r)) + '☆'.repeat(5 - Math.round(r));
  return <Text style={styles.stars}>{stars}</Text>;
}

function WatchLogCard({ item, onDelete }: { item: any; onDelete: (id: string) => void }) {
  const handleLongPress = () => {
    Alert.alert('기록 삭제', '이 관람 기록을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => onDelete(item.id) },
    ]);
  };

  const dateStr = item.watch_date
    ? item.watch_date.replace(/-/g, '.').slice(0, 10)
    : '';

  return (
    <Pressable style={styles.card} onLongPress={handleLongPress}>
      <StarRating rating={item.rating} />
      <Text style={styles.cardTitle}>{item.performances?.title ?? '알 수 없음'}</Text>
      <Text style={styles.cardDate}>{dateStr}</Text>
      {(item.seat || item.casting) && (
        <Text style={styles.cardMeta}>
          {item.seat ? `📍 ${item.seat}` : ''}
          {item.seat && item.casting ? '  ' : ''}
          {item.casting ? `👤 ${item.casting}` : ''}
        </Text>
      )}
      {item.memo ? (
        <>
          <View style={styles.cardDivider} />
          <Text style={styles.cardMemo} numberOfLines={2}>{item.memo}</Text>
        </>
      ) : null}
    </Pressable>
  );
}

export default function RecordsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [genre, setGenre] = useState<GenreFilter>('all');
  const [period, setPeriod] = useState<StatsPeriod>('year');

  const { data: logs = [], isLoading, refetch, isRefetching } = useWatchLogs(genre);
  const { data: stats } = useWatchLogStats(period);
  const { mutate: deleteLog } = useDeleteWatchLog();

  const handleDelete = useCallback((id: string) => deleteLog(id), [deleteLog]);

  const renderItem = useCallback(
    ({ item }: { item: any }) => <WatchLogCard item={item} onDelete={handleDelete} />,
    [handleDelete],
  );

  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>나의 기록</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>로그인 후 관람 기록을 남길 수 있어요</Text>
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => router.push('/auth/login')}
          >
            <Text style={styles.loginBtnText}>로그인하기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>나의 기록</Text>
      </View>

      <FlatList
        data={logs}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {/* 통계 카드 */}
            <View style={styles.statsCard}>
              <View style={styles.statsHeaderRow}>
                <Text style={styles.statsYear}>
                  {period === 'year' ? `${new Date().getFullYear()}년 관극 기록` : '전체 관극 기록'}
                </Text>
                <View style={styles.periodToggle}>
                  {(['year', 'all'] as StatsPeriod[]).map((p) => (
                    <TouchableOpacity
                      key={p}
                      style={[styles.periodBtn, period === p && styles.periodBtnActive]}
                      onPress={() => setPeriod(p)}
                    >
                      <Text style={[styles.periodBtnText, period === p && styles.periodBtnTextActive]}>
                        {p === 'year' ? '올해' : '전체'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stats?.total ?? 0}편</Text>
                  <Text style={styles.statLabel}>총 관람</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stats?.thisMonth ?? 0}편</Text>
                  <Text style={styles.statLabel}>이번달</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stats?.favoriteActor ?? '-'}</Text>
                  <Text style={styles.statLabel}>최애 배우</Text>
                </View>
              </View>
            </View>

            {/* 장르 필터 탭 */}
            <View style={styles.genreBar}>
              {GENRE_TABS.map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  style={styles.genreTab}
                  onPress={() => setGenre(tab.key)}
                >
                  <Text style={[styles.genreTabText, genre === tab.key && styles.genreTabActive]}>
                    {tab.label}
                  </Text>
                  {genre === tab.key && <View style={styles.genreUnderline} />}
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.divider} />
          </>
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>관람 기록이 없어요</Text>
              <Text style={styles.emptySubText}>✏️ 버튼으로 첫 기록을 남겨보세요</Text>
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {isLoading && <ActivityIndicator color={colors.primary} style={styles.loadingIndicator} />}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/record/add')}
        activeOpacity={0.85}
      >
        <Text style={styles.fabIcon}>✏️</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },

  listContent: { paddingBottom: 100 },

  statsCard: {
    backgroundColor: colors.primary,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
  },
  statsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statsYear: { fontSize: 13, fontWeight: '500', color: '#DDD6FE' },
  periodToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 100,
    padding: 2,
  },
  periodBtn: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 100 },
  periodBtnActive: { backgroundColor: '#fff' },
  periodBtnText: { fontSize: 11, fontWeight: '600', color: '#EDE9FE' },
  periodBtnTextActive: { color: colors.primary },
  statsRow: { flexDirection: 'row' },
  statItem: { flex: 1 },
  statValue: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 4 },
  statLabel: { fontSize: 11, color: '#C4B5FD' },

  genreBar: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 20,
    height: 44,
  },
  genreTab: {
    marginRight: 24,
    justifyContent: 'center',
    position: 'relative',
  },
  genreTabText: { fontSize: 14, fontWeight: '500', color: colors.textTertiary },
  genreTabActive: { color: colors.primary, fontWeight: '600' },
  genreUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },

  divider: { height: 1, backgroundColor: colors.divider },

  card: {
    backgroundColor: colors.cardBackground,
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 12,
    padding: 12,
    overflow: 'hidden',
  },
  stars: { fontSize: 13, color: '#F59E0B', marginBottom: 4 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: colors.textPrimary, marginBottom: 4 },
  cardDate: { fontSize: 12, color: colors.textSecondary, marginBottom: 6 },
  cardMeta: { fontSize: 11, color: colors.textTertiary, marginBottom: 4 },
  cardDivider: { height: 1, backgroundColor: colors.divider, marginVertical: 8 },
  cardMemo: { fontSize: 12, color: colors.textSecondary, lineHeight: 17 },

  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: colors.textSecondary, marginBottom: 8 },
  emptySubText: { fontSize: 13, color: colors.textTertiary },

  loginBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  loginBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },

  loadingIndicator: { position: 'absolute', top: '50%', alignSelf: 'center' },

  fab: {
    position: 'absolute',
    right: 16,
    bottom: 96,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  fabIcon: { fontSize: 24 },
});
