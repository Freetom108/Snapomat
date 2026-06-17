import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import { setSubscribed } from '../store/storage';

export default function PaywallOverlay({ onSubscribed }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [loadingPlan, setLoadingPlan] = useState(null);

  async function handleSubscribe(plan) {
    if (loadingPlan) return;
    setLoadingPlan(plan);
    try {
      await setSubscribed(true);
      onSubscribed?.();
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.brand, { color: colors.accent }]}>SNAPOMAT</Text>
        <Text style={[styles.message, { color: colors.text }]}>{t('paywall.message')}</Text>

        <Pressable
          onPress={() => handleSubscribe('monthly')}
          disabled={!!loadingPlan}
          style={({ pressed }) => [
            styles.planButton,
            { backgroundColor: colors.card, borderColor: colors.border },
            pressed && !loadingPlan && { opacity: 0.85 },
          ]}
        >
          {loadingPlan === 'monthly' ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <>
              <Text style={[styles.planName, { color: colors.text }]}>Monthly</Text>
              <Text style={[styles.planPrice, { color: colors.text }]}>
                {t('settings.pricingMonthlyPrice')}
              </Text>
            </>
          )}
        </Pressable>

        <Pressable
          onPress={() => handleSubscribe('yearly')}
          disabled={!!loadingPlan}
          style={({ pressed }) => [
            styles.planButton,
            styles.planButtonFeatured,
            { backgroundColor: colors.card, borderColor: colors.accent },
            pressed && !loadingPlan && { opacity: 0.85 },
          ]}
        >
          {loadingPlan === 'yearly' ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <>
              <Text style={[styles.planName, { color: colors.text }]}>Yearly</Text>
              <Text style={[styles.planPrice, { color: colors.text }]}>
                {t('settings.pricingYearlyPrice')}
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  content: {
    gap: 20,
  },
  brand: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  message: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 17,
    lineHeight: 26,
    textAlign: 'center',
    marginBottom: 8,
  },
  planButton: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    gap: 4,
    minHeight: 72,
    justifyContent: 'center',
  },
  planButtonFeatured: {
    borderWidth: 2,
  },
  planName: {
    fontFamily: 'DMSans_800ExtraBold',
    fontSize: 17,
  },
  planPrice: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
  },
});
