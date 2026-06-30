import { router } from 'expo-router';

// 뒤로 갈 화면이 있으면 back, 없으면(웹 새로고침·딥링크로 직접 진입 등) 홈으로 대체.
// expo-router의 "GO_BACK was not handled" 경고/먹통을 방지한다.
export function goBack() {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/');
  }
}
