import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Alert,
  ActionSheetIOS,
  Platform,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { goBack } from '@/utils/nav';
import { colors, tagColors } from '@/constants/theme';
import { ContentBlock } from '@/types/database';
import { usePost, usePostLike, useDeletePost } from '@/hooks/usePost';
import { useComments, useAddComment, useCommentLike, useDeleteComment } from '@/hooks/useComments';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';

const AVATAR_COLORS = ['#7C3AED', '#059669', '#D97706', '#DC2626', '#2563EB', '#7C3AED', '#0891B2'];

function avatarColor(nickname: string) {
  let h = 0;
  for (let i = 0; i < nickname.length; i++) h = nickname.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

// ── 아바타 ──────────────────────────────────────────────
function Avatar({ nickname, size }: { nickname: string; size: number }) {
  const bg = avatarColor(nickname);
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.38 }]}>{nickname[0]}</Text>
    </View>
  );
}

// ── 태그 pill ────────────────────────────────────────────
function TagPill({ tag }: { tag: string }) {
  const tc = tagColors[tag] ?? { bg: '#F3F4F6', text: '#6B7280' };
  return (
    <View style={[styles.tagPill, { backgroundColor: tc.bg }]}>
      <Text style={[styles.tagText, { color: tc.text }]}>{tag}</Text>
    </View>
  );
}

// ── 댓글 아이템 (재귀) ──────────────────────────────────
interface CommentItemProps {
  comment: any;
  postId: string;
  currentUserId?: string;
  onReply: (commentId: string, nickname: string, depth: number) => void;
  depth: number;
}

function CommentItem({ comment, postId, currentUserId, onReply, depth }: CommentItemProps) {
  const { isLiked, toggleLike } = useCommentLike(comment.id, postId);
  const { mutate: deleteComment } = useDeleteComment(postId);
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const visualDepth = Math.min(depth, 4);
  const indent = visualDepth * 12;
  const isOwn = currentUserId === comment.user_id;

  const showOptions = () => {
    const options = isOwn
      ? ['삭제', '취소']
      : ['신고하기', '작성자 차단하기', '취소'];
    const destructive = isOwn ? 0 : -1;
    const cancel = options.length - 1;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, destructiveButtonIndex: destructive, cancelButtonIndex: cancel },
        (i) => {
          if (isOwn && i === 0) deleteComment(comment.id);
          else if (!isOwn && i === 0) submitReport('comment', comment.id);
          else if (!isOwn && i === 1) blockUser(comment.user_id);
        },
      );
    } else {
      Alert.alert(
        '댓글 옵션',
        undefined,
        isOwn
          ? [
              { text: '삭제', style: 'destructive', onPress: () => deleteComment(comment.id) },
              { text: '취소', style: 'cancel' },
            ]
          : [
              { text: '신고하기', onPress: () => submitReport('comment', comment.id) },
              { text: '차단하기', style: 'destructive', onPress: () => blockUser(comment.user_id) },
              { text: '취소', style: 'cancel' },
            ],
      );
    }
  };

  async function submitReport(type: string, id: string) {
    if (!user) return;
    Alert.alert('신고 카테고리', '신고 이유를 선택해주세요', [
      { text: '스팸', onPress: () => doReport(type, id, 'spam') },
      { text: '욕설·혐오', onPress: () => doReport(type, id, 'hate') },
      { text: '허위정보', onPress: () => doReport(type, id, 'false_info') },
      { text: '불법콘텐츠', onPress: () => doReport(type, id, 'illegal') },
      { text: '기타', onPress: () => doReport(type, id, 'etc') },
      { text: '취소', style: 'cancel' },
    ]);
  }

  async function doReport(type: string, id: string, category: string) {
    if (!user) return;
    await supabase.from('reports').insert({
      reporter_id: user.id,
      target_type: type,
      target_id: id,
      category,
    });
    Alert.alert('신고가 접수되었습니다');
  }

  async function blockUser(userId: string) {
    if (!user) return;
    Alert.alert('사용자 차단', '이 사용자를 차단하시겠어요?', [
      {
        text: '차단',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('blocks').insert({ blocker_id: user.id, blocked_id: userId });
          queryClient.invalidateQueries({ queryKey: ['comments', postId] });
          Alert.alert('차단되었습니다');
        },
      },
      { text: '취소', style: 'cancel' },
    ]);
  }

  const nickname = comment.profiles?.nickname ?? '알 수 없음';

  return (
    <View>
      <View style={[styles.commentItem, { paddingLeft: 16 + indent }]}>
        {/* depth > 0: 왼쪽 세로선 + ㄴ */}
        {depth > 0 && (
          <>
            <View style={[styles.depthLine, { left: 16 + indent - 12 }]} />
            <Text style={[styles.depthSymbol, { left: 16 + indent - 18 }]}>ㄴ</Text>
          </>
        )}

        <View style={styles.commentHeader}>
          <Avatar nickname={nickname} size={22} />
          <Text style={styles.commentNickname}>{nickname}</Text>
          <Text style={styles.commentTime}>{timeAgo(comment.created_at)}</Text>
          <TouchableOpacity onPress={showOptions} style={styles.kebabBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.kebab}>⋮</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.commentContent}>{comment.content}</Text>

        {/* 댓글 이미지 */}
        {(comment.images as string[] | null)?.map((url: string, i: number) => (
          <Image key={i} source={{ uri: url }} style={styles.commentImage} resizeMode="cover" />
        ))}

        <View style={styles.commentActions}>
          <TouchableOpacity onPress={() => toggleLike()} style={styles.actionBtn}>
            <Text style={[styles.actionLike, isLiked && { color: colors.primary }]}>
              ♥ {comment.likes_count}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onReply(comment.id, nickname, depth + 1)} style={styles.actionBtn}>
            <Text style={styles.actionReply}>답글</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={[styles.divider, { marginLeft: 16 + indent }]} />

      {/* 재귀 대댓글 */}
      {comment.replies?.map((reply: any) => (
        <CommentItem
          key={reply.id}
          comment={reply}
          postId={postId}
          currentUserId={currentUserId}
          onReply={onReply}
          depth={depth + 1}
        />
      ))}
    </View>
  );
}

// ── 메인 화면 ──────────────────────────────────────────
type SortKey = 'created_at' | 'likes_count';

const SORT_LABELS: { key: SortKey; label: string }[] = [
  { key: 'created_at', label: '등록순' },
  { key: 'likes_count', label: '답글순' },
];

export default function PostDetailScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const inputRef = useRef<TextInput>(null);

  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; nickname: string; depth: number } | null>(null);
  const [sort, setSort] = useState<SortKey>('created_at');
  const [optionsMenu, setOptionsMenu] = useState<null | 'main' | 'report'>(null);

  const { data: post, isLoading: postLoading } = usePost(postId);
  const { isLiked, toggleLike } = usePostLike(postId);
  const { mutate: deletePost } = useDeletePost(postId);
  const { data: comments = [], isLoading: commentsLoading } = useComments(postId, sort);
  const { mutate: addComment, isPending: addingComment } = useAddComment(postId);
  const queryClient = useQueryClient();

  const isOwn = user?.id === post?.user_id;

  const totalComments = useCallback(() => {
    function count(list: any[]): number {
      return list.reduce((acc, c) => acc + 1 + count(c.replies ?? []), 0);
    }
    return count(comments);
  }, [comments]);

  const handleReply = useCallback((id: string, nickname: string, depth: number) => {
    setReplyTo({ id, nickname, depth });
    setCommentText(`@${nickname} `);
    inputRef.current?.focus();
  }, []);

  const handleSendComment = () => {
    if (!user) return Alert.alert('로그인이 필요합니다');
    if (!commentText.trim()) return;

    addComment({
      post_id: postId,
      parent_id: replyTo?.id,
      depth: replyTo?.depth ?? 0,
      content: commentText.trim(),
      user_id: user.id,
    });

    setCommentText('');
    setReplyTo(null);
  };

  // 플랫폼 공용 확인창 (RNW의 Alert 다중버튼 미지원 → 웹은 window.confirm)
  const confirmAsync = (title: string, message: string): Promise<boolean> => {
    if (Platform.OS === 'web') {
      return Promise.resolve(
        typeof window !== 'undefined' ? window.confirm(`${title}\n\n${message}`) : false,
      );
    }
    return new Promise((resolve) => {
      Alert.alert(title, message, [
        { text: '취소', style: 'cancel', onPress: () => resolve(false) },
        { text: '확인', style: 'destructive', onPress: () => resolve(true) },
      ]);
    });
  };

  const submitReport = async (category: string) => {
    if (!user) return;
    await supabase.from('reports').insert({
      reporter_id: user.id,
      target_type: 'post',
      target_id: postId,
      category,
    });
    setOptionsMenu(null);
    Alert.alert('신고가 접수되었습니다');
  };

  const blockAuthor = async () => {
    if (!user || !post) return;
    setOptionsMenu(null);
    if (!(await confirmAsync('사용자 차단', '이 사용자를 차단하시겠어요?'))) return;
    await supabase.from('blocks').insert({ blocker_id: user.id, blocked_id: post.user_id });
    queryClient.invalidateQueries({ queryKey: ['home-posts'] });
    queryClient.invalidateQueries({ queryKey: ['actor-posts-feed'] });
    queryClient.invalidateQueries({ queryKey: ['performance-posts'] });
    goBack();
  };

  const handleDeletePost = async () => {
    setOptionsMenu(null);
    if (!(await confirmAsync('삭제', '이 게시글을 삭제할까요?'))) return;
    deletePost();
    goBack();
  };

  const REPORT_CATEGORIES: [string, string][] = [
    ['스팸', 'spam'],
    ['욕설·혐오', 'hate'],
    ['허위정보', 'false_info'],
    ['불법콘텐츠', 'illegal'],
    ['기타', 'etc'],
  ];

  if (postLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={colors.primary} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  const authorNickname = (post as any)?.profiles?.nickname ?? '알 수 없음';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{post?.title ?? ''}</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => setOptionsMenu('main')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.kebabIcon}>⋮</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.divider} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          {/* 게시글 본문 */}
          <View style={styles.postSection}>
            {/* 작성자 + 태그 */}
            <View style={styles.postMeta}>
              <Avatar nickname={authorNickname} size={32} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.authorName}>{authorNickname}</Text>
                <Text style={styles.postTime}>{post ? timeAgo(post.created_at) : ''}</Text>
              </View>
              {post?.tag && <TagPill tag={post.tag} />}
            </View>

            {/* 제목 */}
            <Text style={styles.postTitle}>{post?.title}</Text>

            {/* 본문 — content_blocks */}
            {(post?.content_blocks as any[] ?? []).map((block: any, i: number) =>
              block.type === 'text' ? (
                <Text key={i} style={styles.postBody}>{block.value}</Text>
              ) : (
                <Image key={i} source={{ uri: block.url }} style={styles.postImage} resizeMode="cover" />
              ),
            )}

            {/* 좋아요 + 댓글 수 */}
            <View style={styles.reactionRow}>
              <TouchableOpacity onPress={() => toggleLike()} style={styles.reactionBtn}>
                <Text style={[styles.likeCount, isLiked && { color: colors.primary }]}>
                  ♥  {post?.likes_count ?? 0}
                </Text>
              </TouchableOpacity>
              <Text style={styles.commentCount}>💬  {post?.comments_count ?? 0}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* 댓글 헤더 */}
          <View style={styles.commentHeader}>
            <Text style={styles.commentCountLabel}>전체 댓글 {totalComments()}개</Text>
            <View style={styles.sortRow}>
              {SORT_LABELS.map(({ key, label }, i) => (
                <View key={key} style={{ flexDirection: 'row' }}>
                  {i > 0 && <Text style={styles.sortDot}>  ·  </Text>}
                  <TouchableOpacity onPress={() => setSort(key)}>
                    <Text style={[styles.sortBtn, sort === key && styles.sortBtnActive]}>{label}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
          <View style={styles.divider} />

          {/* 댓글 목록 */}
          {commentsLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
          ) : comments.length === 0 ? (
            <View style={styles.emptyComments}>
              <Text style={styles.emptyText}>첫 댓글을 남겨보세요!</Text>
            </View>
          ) : (
            comments.map((c: any) => (
              <CommentItem
                key={c.id}
                comment={c}
                postId={postId}
                currentUserId={user?.id}
                onReply={handleReply}
                depth={0}
              />
            ))
          )}

          <View style={{ height: 80 }} />
        </ScrollView>

        {/* 댓글 입력창 */}
        <View style={styles.inputBar}>
          {replyTo && (
            <View style={styles.replyBadge}>
              <Text style={styles.replyBadgeText}>@{replyTo.nickname} 에게 답글</Text>
              <TouchableOpacity onPress={() => { setReplyTo(null); setCommentText(''); }}>
                <Text style={styles.replyBadgeClose}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.inputRow}>
            <TextInput
              ref={inputRef}
              style={styles.commentInput}
              placeholder="댓글을 입력하세요..."
              placeholderTextColor={colors.textTertiary}
              value={commentText}
              onChangeText={setCommentText}
              multiline
              returnKeyType="send"
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!commentText.trim() || addingComment) && styles.sendBtnDisabled]}
              onPress={handleSendComment}
              disabled={!commentText.trim() || addingComment}
            >
              <Text style={styles.sendIcon}>↑</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* 게시글 옵션 바텀시트 (웹/모바일 공용) */}
      <Modal
        visible={optionsMenu !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setOptionsMenu(null)}
      >
        <Pressable style={styles.optOverlay} onPress={() => setOptionsMenu(null)}>
          <Pressable style={styles.optSheet} onPress={() => {}}>
            {optionsMenu === 'main' && isOwn && (
              <>
                <TouchableOpacity
                  style={styles.optItem}
                  onPress={() => {
                    setOptionsMenu(null);
                    router.push(`/write?postId=${postId}` as never);
                  }}
                >
                  <Text style={styles.optText}>수정</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.optItem} onPress={handleDeletePost}>
                  <Text style={[styles.optText, styles.optDanger]}>삭제</Text>
                </TouchableOpacity>
              </>
            )}
            {optionsMenu === 'main' && !isOwn && (
              <>
                <TouchableOpacity style={styles.optItem} onPress={() => setOptionsMenu('report')}>
                  <Text style={styles.optText}>신고하기</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.optItem} onPress={blockAuthor}>
                  <Text style={[styles.optText, styles.optDanger]}>작성자 차단하기</Text>
                </TouchableOpacity>
              </>
            )}
            {optionsMenu === 'report' && (
              <>
                <Text style={styles.optSheetTitle}>신고 이유</Text>
                {REPORT_CATEGORIES.map(([label, cat]) => (
                  <TouchableOpacity key={cat} style={styles.optItem} onPress={() => submitReport(cat)}>
                    <Text style={styles.optText}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </>
            )}
            <TouchableOpacity style={[styles.optItem, styles.optCancel]} onPress={() => setOptionsMenu(null)}>
              <Text style={styles.optCancelText}>취소</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
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
  backArrow: { fontSize: 20, color: colors.textPrimary, marginRight: 8 },
  headerTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.textPrimary, textAlign: 'center' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  shareIcon: { fontSize: 18, color: colors.textSecondary },
  kebabIcon: { fontSize: 20, color: colors.textSecondary },

  divider: { height: 1, backgroundColor: colors.divider },

  postSection: { backgroundColor: colors.cardBackground, padding: 16 },
  postMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  authorName: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  postTime: { fontSize: 11, color: colors.textTertiary, marginTop: 2 },
  postTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 10, lineHeight: 22 },
  postBody: { fontSize: 13, color: '#374151', lineHeight: 22, marginBottom: 8 },
  postImage: { width: '100%', height: 220, borderRadius: 8, marginBottom: 12, backgroundColor: colors.background },

  reactionRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.divider, marginTop: 12 },
  reactionBtn: { marginRight: 16 },
  likeCount: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },
  commentCount: { fontSize: 13, color: colors.textSecondary },

  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  commentCountLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  sortRow: { flexDirection: 'row', alignItems: 'center' },
  sortDot: { fontSize: 11, color: colors.textTertiary },
  sortBtn: { fontSize: 11, color: colors.textTertiary },
  sortBtnActive: { color: colors.primary, fontWeight: '600' },

  commentItem: { backgroundColor: colors.cardBackground, paddingRight: 16, paddingTop: 10, paddingBottom: 4, position: 'relative' },
  commentHeader2: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  commentNickname: { fontSize: 12, fontWeight: '600', color: colors.textPrimary, marginLeft: 6 },
  commentTime: { fontSize: 10, color: colors.textTertiary, marginLeft: 4, flex: 1 },
  commentContent: { fontSize: 12, color: '#374151', lineHeight: 18, marginTop: 4, marginBottom: 6 },
  commentImage: { width: 120, height: 90, borderRadius: 6, marginBottom: 6 },
  commentActions: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 6 },
  actionBtn: { paddingVertical: 2 },
  actionLike: { fontSize: 11, fontWeight: '500', color: colors.textTertiary },
  actionReply: { fontSize: 11, color: colors.primary },
  kebabBtn: { padding: 4 },
  kebab: { fontSize: 14, color: colors.textTertiary },

  optOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  optSheet: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingBottom: 28,
    paddingHorizontal: 8,
  },
  optSheetTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textTertiary,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  optItem: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  optText: { fontSize: 16, color: colors.textPrimary },
  optDanger: { color: '#DC2626', fontWeight: '600' },
  optCancel: { marginTop: 6, backgroundColor: '#F3F4F6', borderRadius: 12 },
  optCancelText: { fontSize: 16, fontWeight: '600', color: colors.textSecondary },

  depthLine: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: colors.divider },
  depthSymbol: { position: 'absolute', top: 10, fontSize: 11, color: colors.textTertiary },

  emptyComments: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, color: colors.textTertiary },

  inputBar: {
    backgroundColor: colors.cardBackground,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  replyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  replyBadgeText: { fontSize: 12, color: colors.primary },
  replyBadgeClose: { fontSize: 13, color: colors.textTertiary },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.textPrimary,
    maxHeight: 100,
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendIcon: { fontSize: 18, color: '#fff', fontWeight: '700' },

  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700' },

  tagPill: { borderRadius: 100, height: 20, paddingHorizontal: 6, justifyContent: 'center' },
  tagText: { fontSize: 10, fontWeight: '500' },
});

// commentHeader style collision 수정
const extraStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
});

// CommentItem 내 commentHeader 참조 수정
(styles as any).commentHeader = extraStyles.row;
