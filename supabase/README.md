# Supabase 설정 가이드

## 1. 프로젝트 생성

1. [Supabase 대시보드](https://app.supabase.com)에서 새 프로젝트 생성
2. 프로젝트 URL과 anon key를 `.env` 파일에 입력:

```
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

## 2. DB 스키마 마이그레이션

Supabase 대시보드 → **SQL Editor** → 아래 순서로 실행:

### 2-1. 기본 스키마 (테이블 + RLS + 트리거)
`migrations/001_initial_schema.sql` 전체 내용 복사 후 실행

### 2-2. Storage 버킷
`migrations/002_storage_buckets.sql` 전체 내용 복사 후 실행

### 2-3. pg_cron (KOPIS 자동 동기화)
1. 대시보드 → **Database** → **Extensions** → `pg_cron` 활성화
2. `migrations/003_pg_cron.sql` 내용 실행

## 3. Edge Function 배포

```bash
# Supabase CLI 설치
npm install -g supabase

# 로그인
supabase login

# 프로젝트 연결
supabase link --project-ref your-project-ref

# KOPIS 동기화 함수 배포
supabase functions deploy sync-kopis

# 푸시 알림 함수 배포
supabase functions deploy send-push

# Edge Function 환경변수 설정
supabase secrets set KOPIS_API_KEY=your-kopis-api-key
```

KOPIS API 키 발급: [공연예술통합전산망](https://www.kopis.or.kr/por/cs/openapi/openApiInfo.do)

## 4. Kakao OAuth 설정

1. [Kakao Developers](https://developers.kakao.com) → 앱 등록
2. 카카오 로그인 → 활성화
3. Redirect URI 추가:
   - `https://xxxx.supabase.co/auth/v1/callback`
4. Supabase 대시보드 → **Authentication** → **Providers** → Kakao 활성화
   - Kakao REST API Key 입력
   - Kakao Client Secret 입력

## 5. 테이블 구조

| 테이블 | 설명 |
|---|---|
| `performances` | 공연 정보 (KOPIS 연동) |
| `actors` | 배우 정보 |
| `performance_actors` | 공연-배우 매핑 |
| `castings` | 팬 제보 캐스팅 |
| `posts` | 게시글 |
| `comments` | 댓글/대댓글 |
| `bookmarks` | 관심 공연 |
| `actor_follows` | 배우 팔로우 |
| `watch_logs` | 관람 기록 |
| `likes` | 좋아요 |
| `notifications` | 알림 |
| `reports` | 신고 |
| `blocks` | 차단 |
| `profiles` | 유저 프로필 |
