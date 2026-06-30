import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import mobileAds, {
  BannerAd,
  BannerAdSize,
  TestIds,
} from 'react-native-google-mobile-ads';

// ⚠️ 출시 전 TestIds.BANNER → 발급받은 실제 배너 광고 단위 ID로 교체하세요.
// 개발/테스트 빌드에서는 항상 테스트 광고가 표시됩니다.
const adUnitId = __DEV__
  ? TestIds.BANNER
  : 'ca-app-pub-6630409826466167/4121578957'; // TODO: 실제 배너 광고 단위 ID

let initialized = false;

export function AdBanner() {
  useEffect(() => {
    if (!initialized) {
      initialized = true;
      mobileAds()
        .initialize()
        .catch(() => {});
    }
  }, []);

  return (
    <View style={styles.container}>
      <BannerAd unitId={adUnitId} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});
