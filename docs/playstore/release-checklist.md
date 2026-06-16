# 구글 플레이스토어 출시 체크리스트

## 1. 앱 빌드 준비

- [ ] `app.json`의 `version` 및 `android.versionCode` 확인
- [ ] `eas.json` 프로덕션 프로필 설정
- [ ] `npx eas build --platform android --profile production` 으로 AAB 빌드
- [ ] 빌드 완료 후 AAB 파일 다운로드

```json
// eas.json 예시
{
  "build": {
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}
```

---

## 2. 플레이 콘솔 앱 생성

- [ ] [Google Play Console](https://play.google.com/console) 접속
- [ ] '앱 만들기' 클릭
- [ ] 앱 이름: `관극`
- [ ] 기본 언어: `한국어(ko-KR)`
- [ ] 앱 또는 게임: `앱`
- [ ] 유료 또는 무료: `무료`
- [ ] 개발자 프로그램 정책 동의

---

## 3. 스토어 등록 정보 입력

### 기본 정보
- [ ] 앱 이름: `관극 - 뮤지컬·연극 커뮤니티`
- [ ] 간단한 설명 (80자 이내)
- [ ] 자세한 설명 (4,000자 이내)

### 그래픽 자료
- [ ] 앱 아이콘 (512×512 PNG)
- [ ] 피처드 그래픽 (1024×500 PNG/JPEG)
- [ ] 스크린샷 최소 2장 (권장: 1080×1920)

---

## 4. 앱 카테고리 및 태그

- [ ] 카테고리: `소셜`
- [ ] 태그: `커뮤니티`, `공연`, `뮤지컬`
- [ ] 연락처 이메일: `support@gwanggeuk.app`
- [ ] 개인정보처리방침 URL 입력

---

## 5. 콘텐츠 등급 (IARC 설문)

- [ ] 폭력: 없음
- [ ] 성적 콘텐츠: 없음
- [ ] 사용자 생성 콘텐츠: **있음** (신고·차단 기능 구현 완료 ✅)
- [ ] 소셜 기능: 있음
- [ ] 예상 등급: **전체 이용가**

---

## 6. 타겟 고객층

- [ ] 타겟 연령: 만 18세 이상 (또는 전체)
- [ ] 어린이 대상: 아니오

---

## 7. 데이터 보안

- [ ] 이메일 수집: ✅
- [ ] 사진 수집: ✅ (게시글 업로드용)
- [ ] 앱 활동 수집: ✅
- [ ] 제3자 공유: 없음
- [ ] 전송 중 암호화: ✅
- [ ] 데이터 삭제 요청 가능: ✅

---

## 8. 앱 콘텐츠

- [ ] 광고 없음
- [ ] 인앱 구매 없음

---

## 9. 앱 번들 업로드

- [ ] 프로덕션 트랙에 AAB 파일 업로드
- [ ] 출시 노트 작성

```
관극 v1.0.0 첫 번째 출시입니다! 🎭

• 뮤지컬·연극 공연 정보 및 커뮤니티
• 공연별 캐스팅 캘린더
• 관람 기록 및 별점 메모
• 좋아하는 배우 팔로우
• 관심 공연 북마크
```

---

## 10. 최종 검토 및 제출

- [ ] 스토어 등록 정보 최종 확인
- [ ] '검토를 위해 제출' 클릭
- [ ] 심사 기간 대기 (최초 심사: 7일 내외)

### 자주 반려되는 이유
- 신고·차단 기능 미구현 (UGC 정책) → ✅ 구현 완료
- 개인정보처리방침 URL 미등록 → 등록 필요
- 스크린샷 품질 미달
- 앱 설명과 실제 기능 불일치

---

## Supabase 프로덕션 설정

- [ ] 환경 변수로 Supabase URL·anon key 관리
- [ ] RLS 정책 최종 확인
- [ ] Edge Function 배포: `sync-kopis`, `send-push`
- [ ] pg_cron KOPIS 자동 동기화 활성화
- [ ] Storage 버킷 권한 확인 (post-images, avatars)

---

## 카카오 OAuth 설정

- [ ] [Kakao Developers](https://developers.kakao.com) 앱 등록
- [ ] Android 플랫폼 추가 (패키지명: `com.stagetalk.app`)
- [ ] Supabase 대시보드 → Authentication → Providers → Kakao 활성화
- [ ] Kakao REST API Key, Client Secret 입력
- [ ] Redirect URI: `https://<your-project>.supabase.co/auth/v1/callback`
