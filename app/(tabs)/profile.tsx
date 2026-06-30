import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';
import { useBookmarks, useActorFollows } from '@/hooks/useBookmarks';
import { useWatchLogStats } from '@/hooks/useWatchLogs';
import { supabase } from '@/lib/supabase';

const PERF_BAR_COLORS = [
  '#7C3AED', '#1D4ED8', '#065F46', '#92400E', '#9333EA', '#0369A1',
];

const ACTOR_COLORS = [
  '#7C3AED', '#2563EB', '#059669', '#92400E', '#DC2626',
  '#9333EA', '#1D4ED8', '#047857', '#B45309', '#B91C1C',
];

function getColor(name: string, palette: string[]): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

function MenuItem({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <Text style={styles.menuIcon}>{icon}</Text>
      <Text style={[styles.menuLabel, danger && styles.menuDanger]}>{label}</Text>
      <Text style={styles.menuArrow}>→</Text>
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const setSession = useAuthStore((s) => s.setSession);

  const { data: bookmarks = [] } = useBookmarks();
  const { data: actorFollows = [] } = useActorFollows();
  const { data: stats } = useWatchLogStats();

  const nickname = profile?.nickname ?? user?.email?.split('@')[0] ?? '사용자';
  const avatarUrl = profile?.avatar_url;
  const firstChar = nickname.charAt(0);
  const avatarColor = getColor(nickname, ACTOR_COLORS);

  const handleLogout = () => {
    Alert.alert('로그아웃', '로그아웃 할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          setSession(null);
        },
      },
    ]);
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>내 정보</Text>
        </View>
        <View style={styles.loginPrompt}>
          <Text style={styles.loginPromptText}>로그인하고 나만의 기록을 남겨보세요</Text>
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
        <Text style={styles.headerTitle}>내 정보</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* 프로필 카드 */}
        <View style={styles.profileCard}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
              <Text style={styles.avatarText}>{firstChar}</Text>
            </View>
          )}
          <View style={styles.profileInfo}>
            <Text style={styles.nickname}>{nickname}</Text>
            <Text style={styles.profileStats}>
              관람 {stats?.total ?? 0}편  |  팔로잉 배우 {actorFollows.length}명
            </Text>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => router.push('/profile/edit')}
            >
              <Text style={styles.editBtnText}>프로필 수정</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 관심 공연 */}
        <Text style={styles.sectionTitle}>관심 공연</Text>
        {bookmarks.length === 0 ? (
          <View style={styles.emptyRow}>
            <Text style={styles.emptyText}>북마크한 공연이 없어요</Text>
          </View>
        ) : (
          bookmarks.slice(0, 5).map((bm: any, idx: number) => (
            <TouchableOpacity
              key={bm.id}
              style={styles.perfItem}
              onPress={() => router.push(`/performance/${bm.performances.id}`)}
            >
              <View style={[styles.perfBar, { backgroundColor: PERF_BAR_COLORS[idx % PERF_BAR_COLORS.length] }]} />
              <View style={styles.perfInfo}>
                <Text style={styles.perfTitle}>{bm.performances.title}</Text>
              </View>
              <Text style={styles.menuArrow}>→</Text>
            </TouchableOpacity>
          ))
        )}

        {/* 팔로잉 배우 */}
        <Text style={styles.sectionTitle}>팔로잉 배우</Text>
        {actorFollows.length === 0 ? (
          <View style={styles.emptyRow}>
            <Text style={styles.emptyText}>팔로잉한 배우가 없어요</Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.actorRow}
            contentContainerStyle={styles.actorRowContent}
          >
            {actorFollows.map((f: any) => {
              const name: string = f.actors?.name ?? '';
              const bg = getColor(name, ACTOR_COLORS);
              return (
                <TouchableOpacity
                  key={f.id}
                  style={styles.actorItem}
                  onPress={() => router.push(`/actor/${f.actors.id}`)}
                >
                  <View style={[styles.actorAvatar, { backgroundColor: bg }]}>
                    <Text style={styles.actorAvatarText}>{name.charAt(0)}</Text>
                  </View>
                  <Text style={styles.actorName}>{name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* 설정 */}
        <Text style={styles.sectionTitle}>설정</Text>
        <View style={styles.menuGroup}>
          <MenuItem icon="🔔" label="알림 설정" onPress={() => router.push('/settings/notifications')} />
          <View style={styles.menuDivider} />
          <MenuItem icon="⚙️" label="계정 설정" onPress={() => router.push('/settings/account')} />
          <View style={styles.menuDivider} />
          <MenuItem icon="📢" label="공지사항" onPress={() => router.push('/notices')} />
          <View style={styles.menuDivider} />
          <MenuItem icon="💬" label="문의하기" onPress={() => router.push('/inquiry')} />
          <View style={styles.menuDivider} />
          <MenuItem icon="📄" label="이용약관" onPress={() => router.push('/legal/terms')} />
          <View style={styles.menuDivider} />
          <MenuItem icon="🔒" label="개인정보 처리방침" onPress={() => router.push('/legal/privacy')} />
          <View style={styles.menuDivider} />
          <MenuItem icon="🚪" label="로그아웃" onPress={handleLogout} danger />
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
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

  scroll: { paddingBottom: 20 },

  profileCard: {
    backgroundColor: colors.cardBackground,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: { width: 72, height: 72, borderRadius: 36 },
  avatarText: { fontSize: 26, fontWeight: '700', color: '#fff' },
  profileInfo: { flex: 1 },
  nickname: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, marginBottom: 4 },
  profileStats: { fontSize: 12, color: colors.textSecondary, marginBottom: 8 },
  editBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
  },
  editBtnText: { fontSize: 11, fontWeight: '500', color: '#6D28D9' },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 10,
  },

  perfItem: {
    backgroundColor: colors.cardBackground,
    marginHorizontal: 20,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    marginBottom: 8,
    overflow: 'hidden',
  },
  perfBar: { width: 6, height: '100%' },
  perfInfo: { flex: 1, paddingHorizontal: 12 },
  perfTitle: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },

  actorRow: { marginHorizontal: 20 },
  actorRowContent: { paddingRight: 8, gap: 16 },
  actorItem: { alignItems: 'center', width: 56 },
  actorAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  actorAvatarText: { fontSize: 18, fontWeight: '700', color: '#fff' },
  actorName: { fontSize: 10, color: '#374151', textAlign: 'center' },

  menuGroup: {
    backgroundColor: colors.cardBackground,
    marginHorizontal: 20,
    borderRadius: 10,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
  },
  menuIcon: { fontSize: 18, marginRight: 10 },
  menuLabel: { flex: 1, fontSize: 14, color: colors.textPrimary },
  menuDanger: { color: colors.danger },
  menuArrow: { fontSize: 16, color: colors.textTertiary },
  menuDivider: { height: 1, backgroundColor: colors.divider, marginLeft: 40 },

  emptyRow: { marginHorizontal: 20, paddingVertical: 12 },
  emptyText: { fontSize: 13, color: colors.textTertiary },

  loginPrompt: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loginPromptText: { fontSize: 14, color: colors.textSecondary, marginBottom: 16 },
  loginBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  loginBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
