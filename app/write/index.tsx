import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors } from '@/constants/theme';
import { ContentBlock } from '@/types/database';
import { useCreatePost } from '@/hooks/useCreatePost';
import { useAuthStore } from '@/store/authStore';

type Board = 'performance' | 'actor' | 'tips';

const BOARD_TAGS: Record<Board, string[]> = {
  performance: ['후기(스포없음)', '후기(스포있음)', '질문', '정보', '잡담'],
  actor:       ['후기', '정보', '질문', '잡담'],
  tips:        ['정보', '팁', '질문', '잡담'],
};

const TAG_COLORS: Record<string, { bg: string; text: string }> = {
  '후기(스포없음)': { bg: '#F3F4F6', text: '#6B7280' },
  '후기(스포있음)': { bg: '#FEE2E2', text: '#991B1B' },
  '후기':           { bg: '#FEE2E2', text: '#991B1B' },
  '질문':           { bg: '#DBEAFE', text: '#1E40AF' },
  '정보':           { bg: '#D1FAE5', text: '#065F46' },
  '잡담':           { bg: '#FEF9C3', text: '#713F12' },
  '팁':             { bg: '#D1FAE5', text: '#065F46' },
};

export default function WriteScreen() {
  const router = useRouter();
  const { performanceId, actorId, board: boardParam } = useLocalSearchParams<{
    performanceId?: string;
    actorId?: string;
    board?: Board;
  }>();

  const board: Board = boardParam ?? (performanceId ? 'performance' : actorId ? 'actor' : 'tips');
  const user = useAuthStore((s) => s.user);
  const { createPost, isPending, pickAndUploadImages, uploadProgress, isUploading } = useCreatePost();

  const [selectedTag, setSelectedTag] = useState('');
  const [title, setTitle] = useState('');
  const [blocks, setBlocks] = useState<ContentBlock[]>([{ type: 'text', value: '' }]);
  const [activeBlockIndex, setActiveBlockIndex] = useState(0);

  const tags = BOARD_TAGS[board];

  const boardLabel = board === 'performance' ? '공연 게시판' : board === 'actor' ? '배우 게시판' : '정보·팁';

  // 텍스트 블록 업데이트
  const updateTextBlock = (index: number, value: string) => {
    setBlocks((prev) => prev.map((b, i) => (i === index ? { ...b, value } : b)));
  };

  // 이미지 추가: 현재 활성 텍스트 블록 다음에 삽입
  const handleAddImage = async () => {
    const insertAt = activeBlockIndex + 1;
    const newBlocks = await pickAndUploadImages(blocks, insertAt);
    // 이미지 블록 다음에 빈 텍스트 블록 추가 (없으면)
    const lastBlock = newBlocks[newBlocks.length - 1];
    if (lastBlock && lastBlock.type !== 'text') {
      newBlocks.push({ type: 'text', value: '' });
    }
    setBlocks(newBlocks);
    setActiveBlockIndex(insertAt + (newBlocks.length - blocks.length - 1));
  };

  // 이미지 삭제
  const removeImageBlock = (index: number) => {
    setBlocks((prev) => {
      const next = prev.filter((_, i) => i !== index);
      // 연속 텍스트 블록 합치기 방지 — 그냥 삭제
      return next.length === 0 ? [{ type: 'text', value: '' }] : next;
    });
  };

  const handleSubmit = async () => {
    if (!user) return Alert.alert('로그인이 필요합니다');
    if (!selectedTag) return Alert.alert('태그를 선택해주세요');
    if (!title.trim()) return Alert.alert('제목을 입력해주세요');

    const contentBlocks = blocks.filter(
      (b) => (b.type === 'text' && b.value?.trim()) || b.type === 'image',
    );
    if (contentBlocks.length === 0) return Alert.alert('본문을 입력해주세요');

    try {
      await createPost({
        board,
        performance_id: performanceId,
        actor_id: actorId,
        tag: selectedTag,
        title: title.trim(),
        content_blocks: contentBlocks,
        user_id: user.id,
      });
      router.back();
    } catch (e) {
      Alert.alert('작성 실패', '잠시 후 다시 시도해주세요');
    }
  };

  const canSubmit = !!selectedTag && !!title.trim() && !isPending && !isUploading;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} disabled={isPending || isUploading}>
          <Text style={styles.cancelText}>취소</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{boardLabel}</Text>
        <TouchableOpacity onPress={handleSubmit} disabled={!canSubmit}>
          <Text style={[styles.submitText, !canSubmit && styles.submitDisabled]}>등록</Text>
        </TouchableOpacity>
      </View>

      {/* 업로드 진행률 오버레이 */}
      {isUploading && (
        <View style={styles.uploadOverlay}>
          <View style={styles.uploadBox}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.uploadText}>이미지 업로드 중... {uploadProgress}%</Text>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBar, { width: `${uploadProgress}%` }]} />
            </View>
          </View>
        </View>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          {/* 태그 선택 */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>태그 선택</Text>
            <View style={styles.tagRow}>
              {tags.map((tag) => {
                const tc = TAG_COLORS[tag] ?? { bg: '#F3F4F6', text: '#6B7280' };
                const isSelected = selectedTag === tag;
                return (
                  <TouchableOpacity
                    key={tag}
                    style={[
                      styles.tagPill,
                      { backgroundColor: isSelected ? tc.bg : '#F9FAFB' },
                      isSelected && styles.tagPillSelected,
                    ]}
                    onPress={() => setSelectedTag(tag)}
                  >
                    <Text style={[styles.tagPillText, { color: isSelected ? tc.text : colors.textSecondary }]}>
                      {tag}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.divider} />

          {/* 제목 */}
          <TextInput
            style={styles.titleInput}
            placeholder="제목을 입력하세요"
            placeholderTextColor={colors.textTertiary}
            value={title}
            onChangeText={setTitle}
            maxLength={100}
            returnKeyType="next"
          />

          <View style={styles.divider} />

          {/* 본문 — 텍스트 + 이미지 블록 혼합 */}
          <View style={styles.contentArea}>
            {blocks.map((block, i) =>
              block.type === 'text' ? (
                <TextInput
                  key={i}
                  style={styles.bodyInput}
                  placeholder={i === 0 ? '내용을 입력하세요\n\n이미지 버튼으로 사진을 삽입할 수 있어요' : ''}
                  placeholderTextColor={colors.textTertiary}
                  value={block.value ?? ''}
                  onChangeText={(v) => updateTextBlock(i, v)}
                  multiline
                  textAlignVertical="top"
                  onFocus={() => setActiveBlockIndex(i)}
                />
              ) : (
                <View key={i} style={styles.imageBlock}>
                  <Image source={{ uri: block.url }} style={styles.contentImage} resizeMode="cover" />
                  <TouchableOpacity style={styles.removeImageBtn} onPress={() => removeImageBlock(i)}>
                    <Text style={styles.removeImageText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ),
            )}
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* 하단 툴바 */}
        <View style={styles.toolbar}>
          <TouchableOpacity
            style={styles.toolbarBtn}
            onPress={handleAddImage}
            disabled={isUploading || isPending}
          >
            <Text style={styles.toolbarIcon}>🖼️</Text>
            <Text style={styles.toolbarLabel}>사진 ({blocks.filter((b) => b.type === 'image').length}/10)</Text>
          </TouchableOpacity>
          <View style={styles.toolbarDivider} />
          <Text style={styles.charCount}>{title.length}/100</Text>
        </View>
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
  submitText: { fontSize: 15, fontWeight: '600', color: colors.primary },
  submitDisabled: { opacity: 0.4 },

  uploadOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadBox: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: 220,
  },
  uploadText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  progressBarBg: {
    width: 160,
    height: 4,
    backgroundColor: colors.divider,
    borderRadius: 2,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },

  section: { padding: 16 },
  sectionLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 10 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagPill: {
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  tagPillSelected: { borderColor: 'transparent' },
  tagPillText: { fontSize: 13, fontWeight: '500' },

  divider: { height: 1, backgroundColor: colors.divider },

  titleInput: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '500',
  },

  contentArea: { paddingHorizontal: 16, paddingTop: 12 },
  bodyInput: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 22,
    minHeight: 160,
    paddingBottom: 12,
  },

  imageBlock: { marginBottom: 12, position: 'relative' },
  contentImage: {
    width: '100%',
    height: 220,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeImageText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 48,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.cardBackground,
  },
  toolbarBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 12 },
  toolbarIcon: { fontSize: 18 },
  toolbarLabel: { fontSize: 13, color: colors.textSecondary },
  toolbarDivider: { width: 1, height: 20, backgroundColor: colors.divider, marginHorizontal: 12 },
  charCount: { fontSize: 12, color: colors.textTertiary, marginLeft: 'auto' },
});
