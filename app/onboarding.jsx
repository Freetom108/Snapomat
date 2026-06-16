import { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  PanResponder,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Circle, Path, Rect, G } from 'react-native-svg';
import { useFonts, DMSans_400Regular, DMSans_500Medium, DMSans_700Bold, DMSans_900Black } from '@expo-google-fonts/dm-sans';
import ExpenseRing, { RING_SIZE } from '../components/ExpenseRing';
import { getCategory } from '../constants/categories';
import { useTranslation } from '../hooks/useTranslation';

const ONBOARDING_DONE_KEY = 'snapomat_onboarding_done';

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

const ONBOARDING_RING_COLORS = {
  accent: GOLD,
  text: WHITE,
  muted: GRAY,
  border: DIM,
};

const ONBOARDING_RING_STATS = {
  spent: 953,
  percent: 38,
  progress: 0.38,
  budgetFormatted: '2.500',
};

function Slide2Illustration() {
  return (
    <ExpenseRing
      stats={ONBOARDING_RING_STATS}
      colors={ONBOARDING_RING_COLORS}
      styles={onboardingRingStyles}
      showMonthLabel={false}
    />
  );
}

const FIXED_COST_CATEGORY = getCategory('fixed');

const FIXED_COST_ROWS = [
  { id: 'rent', name: 'Miete', amount: '780 €' },
  { id: 'utilities', name: 'Strom & Gas', amount: '120 €' },
  { id: 'wifi', name: 'WLAN', amount: '35 €' },
  { id: 'netflix', name: 'Netflix', amount: '18 €' },
];

function Slide3Illustration() {
  return (
    <View style={styles.fixedCostsCard}>
      {FIXED_COST_ROWS.map((row, index) => (
        <View
          key={row.id}
          style={[
            styles.fixedCostRow,
            index < FIXED_COST_ROWS.length - 1 && styles.fixedCostRowBorder,
          ]}
        >
          <View style={styles.fixedCostIcon}>
            <Text style={styles.fixedCostEmoji}>{FIXED_COST_CATEGORY?.emoji}</Text>
          </View>
          <Text style={styles.fixedCostName}>{row.name}</Text>
          <Text style={styles.fixedCostAmount}>{row.amount}</Text>
        </View>
      ))}
      <View style={styles.fixedCostDivider} />
      <View style={styles.fixedCostTotalRow}>
        <Text style={styles.fixedCostTotalLabel}>Gesamt:</Text>
        <Text style={styles.fixedCostTotalAmount}>953 €</Text>
      </View>
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
  const { replay } = useLocalSearchParams();
  const { t } = useTranslation();
  const isReplay = replay === '1' || replay === 'true';
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
    if (!isReplay) {
      await AsyncStorage.setItem(ONBOARDING_DONE_KEY, 'true');
    }
    router.replace('/(tabs)/');
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
  const isLastSlide = slide === slides.length - 1;

  return (
    <SafeAreaView style={styles.container}>
      {!isLastSlide ? (
        <Pressable onPress={finishOnboarding} style={styles.skipButton} hitSlop={12}>
          <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
        </Pressable>
      ) : null}

      <View style={styles.content} {...(isLastSlide ? {} : panResponder.panHandlers)}>
        <View style={styles.illustration}>
          <Illustration />
        </View>

        <Text style={styles.titleWhite}>{current.titleWhite}</Text>
        <Text style={styles.titleGold}>{current.titleGold}</Text>
        <Text style={styles.subtext}>{current.subtext}</Text>
        {current.smallText ? <Text style={styles.smallText}>{current.smallText}</Text> : null}
      </View>

      <View style={styles.footer}>
        {!isLastSlide ? (
          <View style={styles.dots}>
            {slides.map((_, index) => (
              <View
                key={index}
                style={[styles.dot, index === slide ? styles.dotActive : styles.dotInactive]}
              />
            ))}
          </View>
        ) : null}

        {isLastSlide ? (
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
    marginTop: 24,
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
  fixedCostsCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    width: 300,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  fixedCostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  fixedCostRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  fixedCostIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: '#252525',
  },
  fixedCostEmoji: {
    fontSize: 20,
  },
  fixedCostName: {
    flex: 1,
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    color: WHITE,
  },
  fixedCostAmount: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
    color: WHITE,
  },
  fixedCostDivider: {
    height: 1,
    backgroundColor: '#2A2A2A',
    marginTop: 4,
    marginBottom: 12,
  },
  fixedCostTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fixedCostTotalLabel: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    color: GOLD,
  },
  fixedCostTotalAmount: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
    color: GOLD,
  },
});

const onboardingRingStyles = StyleSheet.create({
  ringSection: {
    alignItems: 'center',
  },
  monthLabel: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 12,
    color: GRAY,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  ringLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: GRAY,
  },
  ringAmount: {
    fontFamily: 'DMSans_900Black',
    fontSize: 36,
    color: WHITE,
    lineHeight: 42,
  },
  ringPercent: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 13,
    color: GOLD,
    marginTop: 2,
  },
  ringBudget: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: GRAY,
    marginTop: 2,
  },
});
