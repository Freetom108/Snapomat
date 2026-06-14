import { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  PanResponder,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect, G } from 'react-native-svg';
import { useFonts, DMSans_400Regular, DMSans_500Medium, DMSans_700Bold, DMSans_900Black } from '@expo-google-fonts/dm-sans';
import { getCategoryLabel } from '../constants/categories';
import { useTranslation } from '../hooks/useTranslation';
import { setOnboardingDone } from '../store/storage';

const GOLD = '#E8B84B';
const GRAY = '#666666';
const WHITE = '#FFFFFF';
const BG = '#000000';
const CARD = '#181818';
const DIM = '#333333';

const SWIPE_THRESHOLD = 50;

function Slide1Illustration() {
  return (
    <Svg width={200} height={260} viewBox="0 0 200 260">
      <Rect x={50} y={10} width={100} height={200} rx={18} fill="#111111" stroke="#2A2A2A" strokeWidth={2} />
      <Rect x={58} y={28} width={84} height={164} rx={6} fill="#0A0A0A" />
      <Rect x={78} y={18} width={44} height={6} rx={3} fill="#1A1A1A" />
      <Circle cx={100} cy={118} r={32} fill="#080808" stroke={GOLD} strokeWidth={3} />
      <Circle cx={100} cy={118} r={20} fill="#141414" stroke="#2A2A2A" strokeWidth={1.5} />
      <Circle cx={100} cy={118} r={8} fill="#0A0A0A" />
      <G transform="translate(128, 36)">
        <Path
          d="M0 0 L6 14 L2 14 L8 28 L2 18 L6 18 Z"
          fill={GOLD}
        />
      </G>
      <Rect x={88} y={210} width={24} height={4} rx={2} fill="#2A2A2A" />
    </Svg>
  );
}

function Slide2Illustration() {
  const size = 180;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = 0.38;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <View style={styles.slide2Wrap}>
      <View style={styles.ringWrap}>
        <Svg width={size} height={size}>
          <Circle
            cx={cx}
            cy={cy}
            r={radius}
            stroke={DIM}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={cx}
            cy={cy}
            r={radius}
            stroke={GOLD}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${cx}, ${cy}`}
          />
        </Svg>
        <View style={styles.ringCenter}>
          <Text style={styles.ringAmount}>378</Text>
          <Text style={styles.ringPercent}>38%</Text>
        </View>
      </View>
    </View>
  );
}

const CATEGORY_ROWS = [
  { id: 'home', emoji: '🏠', amount: '89€', percent: '24%' },
  { id: 'mobility', emoji: '🚗', amount: '82€', percent: '22%' },
  { id: 'food', emoji: '🛒', amount: '62€', percent: '16%' },
  { id: 'shopping', emoji: '🛍️', amount: '50€', percent: '13%' },
];

function Slide3Illustration() {
  return (
    <View style={styles.categoryCard}>
      {CATEGORY_ROWS.map((row, index) => (
        <View
          key={row.id}
          style={[styles.categoryRow, index < CATEGORY_ROWS.length - 1 && styles.categoryRowBorder]}
        >
          <Text style={styles.categoryLabel}>
            {getCategoryLabel(row.id)} {row.emoji}
          </Text>
          <View style={styles.categoryRight}>
            <Text style={styles.categoryAmount}>{row.amount}</Text>
            <Text style={styles.categoryPercent}>{row.percent}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function getSlides(t) {
  return [
    {
      Illustration: Slide1Illustration,
      titleWhite: t('onboarding.title1'),
      titleGold: t('onboarding.title1gold'),
      subtext: t('onboarding.sub1'),
      smallText: t('onboarding.sub1small'),
    },
    {
      Illustration: Slide2Illustration,
      titleWhite: t('onboarding.title2'),
      titleGold: t('onboarding.title2gold'),
      subtext: t('onboarding.sub2'),
      smallText: null,
    },
    {
      Illustration: Slide3Illustration,
      titleWhite: t('onboarding.title3'),
      titleGold: t('onboarding.title3gold'),
      subtext: t('onboarding.sub3'),
      smallText: null,
    },
  ];
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [slide, setSlide] = useState(0);
  const slides = useMemo(() => getSlides(t), [t]);

  const slideRef = useRef(slide);
  slideRef.current = slide;

  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
    DMSans_900Black,
  });

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 12,
      onMoveShouldSetPanResponderCapture: (_, gesture) => Math.abs(gesture.dx) > 12,
      onPanResponderRelease: (_, gesture) => {
        const current = slideRef.current;
        if (gesture.dx < -SWIPE_THRESHOLD && current < slides.length - 1) {
          setSlide(current + 1);
        } else if (gesture.dx > SWIPE_THRESHOLD && current > 0) {
          setSlide(current - 1);
        }
      },
    }),
  ).current;

  async function finishOnboarding() {
    await setOnboardingDone();
    router.replace('/(tabs)');
  }

  if (!fontsLoaded) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color={GOLD} />
      </View>
    );
  }

  const current = slides[slide];
  const { Illustration } = current;

  return (
    <SafeAreaView style={styles.container}>
      <Pressable onPress={finishOnboarding} style={styles.skipButton} hitSlop={12}>
        <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
      </Pressable>

      <View style={styles.content} {...panResponder.panHandlers}>
        <View style={styles.illustration}>
          <Illustration />
        </View>

        <Text style={styles.titleWhite}>{current.titleWhite}</Text>
        <Text style={styles.titleGold}>{current.titleGold}</Text>
        <Text style={styles.subtext}>{current.subtext}</Text>
        {current.smallText ? <Text style={styles.smallText}>{current.smallText}</Text> : null}
      </View>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[styles.dot, index === slide ? styles.dotActive : styles.dotInactive]}
            />
          ))}
        </View>

        {slide === slides.length - 1 ? (
          <Pressable
            onPress={finishOnboarding}
            style={({ pressed }) => [styles.startButton, pressed && styles.startButtonPressed]}
          >
            <Text style={styles.startButtonText}>{t('onboarding.getStarted')}</Text>
          </Pressable>
        ) : (
          <View style={styles.startButtonPlaceholder} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButton: {
    position: 'absolute',
    top: 56,
    right: 24,
    zIndex: 10,
  },
  skipText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
    color: GRAY,
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 72,
    justifyContent: 'center',
  },
  illustration: {
    alignItems: 'center',
    marginBottom: 36,
  },
  titleWhite: {
    fontFamily: 'DMSans_900Black',
    fontSize: 26,
    color: WHITE,
    textAlign: 'center',
    lineHeight: 32,
  },
  titleGold: {
    fontFamily: 'DMSans_900Black',
    fontSize: 26,
    color: GOLD,
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 16,
  },
  subtext: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 17,
    color: GRAY,
    textAlign: 'center',
    lineHeight: 26,
  },
  smallText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: GRAY,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 12,
  },
  footer: {
    paddingHorizontal: 28,
    paddingBottom: 32,
    alignItems: 'center',
    gap: 24,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: GOLD,
  },
  dotInactive: {
    width: 8,
    backgroundColor: GRAY,
  },
  startButton: {
    width: '100%',
    backgroundColor: GOLD,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  startButtonPressed: {
    opacity: 0.85,
  },
  startButtonText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 17,
    color: '#000000',
  },
  startButtonPlaceholder: {
    height: 52,
  },
  slide2Wrap: {
    alignItems: 'center',
  },
  ringWrap: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  ringAmount: {
    fontFamily: 'DMSans_900Black',
    fontSize: 36,
    color: WHITE,
  },
  ringPercent: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
    color: GOLD,
    marginTop: 2,
  },
  categoryCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    width: 280,
    overflow: 'hidden',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  categoryRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  categoryLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
    color: WHITE,
  },
  categoryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryAmount: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
    color: WHITE,
  },
  categoryPercent: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    color: GOLD,
    minWidth: 36,
    textAlign: 'right',
  },
});
