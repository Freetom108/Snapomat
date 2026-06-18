import { Modal, View, Text, Pressable, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';

const PRICING_SHEET_MAX_HEIGHT = Dimensions.get('window').height * 0.9;
const SHEET_MIN_HEIGHT = Dimensions.get('window').height * 0.35;

function withAlpha(hex, alpha) {
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
}

function PlanFeature({ text, colors, styles }) {
  return <Text style={[styles.planFeature, { color: colors.muted }]}>{text}</Text>;
}

function PlanCard({ name, price, featured, badge, children, colors, styles }) {
  return (
    <View
      style={[
        styles.planCard,
        { backgroundColor: colors.background, borderColor: colors.border },
        featured && { borderColor: withAlpha(colors.accent, 0.35) },
      ]}
    >
      <View style={styles.planHeader}>
        <View style={styles.planNameRow}>
          <Text style={[styles.planName, { color: colors.text }]}>{name}</Text>
          {badge ? (
            <View style={[styles.planBadge, { backgroundColor: withAlpha(colors.accent, 0.18) }]}>
              <Text style={[styles.planBadgeText, { color: colors.accent }]}>{badge}</Text>
            </View>
          ) : null}
        </View>
        <Text style={[styles.planPrice, { color: colors.text }]}>{price}</Text>
      </View>
      {children}
    </View>
  );
}

export default function CreditsPricingSheet({ visible, onClose }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = createStyles(colors);

  const packs = [
    { credits: t('settings.pricingPack50'), price: t('settings.pricingPack50Price') },
    { credits: t('settings.pricingPack200'), price: t('settings.pricingPack200Price') },
    { credits: t('settings.pricingPack500'), price: t('settings.pricingPack500Price') },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={() => {}}>
      <View style={styles.pricingOverlay}>
        <View style={[styles.bottomSheet, { backgroundColor: colors.card }]}>
          <View style={styles.pricingSheetHeader}>
            <View style={styles.pricingHeaderText}>
              <Text style={[styles.pricingHeaderTitle, { color: colors.text }]}>
                ⚡ {t('settings.subscriptionCreditsTitle')}
              </Text>
              <Text style={[styles.pricingHeaderSubtitle, { color: colors.muted }]}>
                {t('settings.pricingSubtitle')}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={({ pressed }) => [styles.pricingCloseButton, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
            >
              <Text style={[styles.pricingCloseText, { color: colors.muted }]}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.bottomSheetScroll}
            contentContainerStyle={styles.pricingScroll}
            showsVerticalScrollIndicator
            bounces
            nestedScrollEnabled
          >
            <PlanCard name="Free" price="0 €" colors={colors} styles={styles}>
              <PlanFeature text={t('settings.pricingFreeDescription')} colors={colors} styles={styles} />
            </PlanCard>

            <PlanCard name="Monthly" price={t('settings.pricingMonthlyPrice')} colors={colors} styles={styles}>
              <PlanFeature text={t('settings.pricingMonthlyCredits')} colors={colors} styles={styles} />
              <PlanFeature text={t('settings.pricingMonthlyManual')} colors={colors} styles={styles} />
              <Text style={[styles.planFootnote, { color: colors.muted }]}>
                {t('settings.pricingCancelAnytime')}
              </Text>
            </PlanCard>

            <PlanCard
              name="Yearly"
              price={t('settings.pricingYearlyPrice')}
              featured
              colors={colors}
              styles={styles}
            >
              <PlanFeature text={t('settings.pricingMonthlyCredits')} colors={colors} styles={styles} />
              <PlanFeature text={t('settings.pricingMonthlyManual')} colors={colors} styles={styles} />
            </PlanCard>

            <Text style={[styles.packsSectionLabel, { color: colors.muted }]}>
              {t('settings.pricingAddonPacks')}
            </Text>
            <View style={[styles.packsCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
              {packs.map((pack, index) => (
                <View
                  key={pack.credits}
                  style={[
                    styles.packRow,
                    index < packs.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 },
                  ]}
                >
                  <Text style={[styles.packCredits, { color: colors.text }]}>{pack.credits}</Text>
                  <Text style={[styles.packPrice, { color: colors.text }]}>{pack.price}</Text>
                </View>
              ))}
            </View>

            <Text style={[styles.pricingFooter, { color: colors.muted }]}>
              {t('settings.pricingAddonFooter')}
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function createStyles() {
  return StyleSheet.create({
    pricingOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end',
    },
    bottomSheet: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      minHeight: SHEET_MIN_HEIGHT,
      maxHeight: PRICING_SHEET_MAX_HEIGHT,
      width: '100%',
    },
    bottomSheetScroll: {
      flexGrow: 1,
      flexShrink: 1,
    },
    pricingSheetHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 12,
      gap: 12,
    },
    pricingHeaderText: {
      flex: 1,
      gap: 4,
    },
    pricingCloseButton: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pricingCloseText: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 22,
      lineHeight: 24,
    },
    pricingScroll: {
      paddingHorizontal: 20,
      paddingBottom: 32,
    },
    pricingHeaderTitle: {
      fontFamily: 'DMSans_900Black',
      fontSize: 22,
    },
    pricingHeaderSubtitle: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 14,
      lineHeight: 20,
    },
    planCard: {
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
    },
    planHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 12,
      gap: 12,
    },
    planNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
      flexWrap: 'wrap',
    },
    planName: {
      fontFamily: 'DMSans_800ExtraBold',
      fontSize: 17,
    },
    planBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
    },
    planBadgeText: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 11,
    },
    planPrice: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 15,
    },
    planFeature: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 13,
      lineHeight: 19,
      marginBottom: 4,
    },
    planFootnote: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 12,
      marginTop: 8,
    },
    packsSectionLabel: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 11,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      marginBottom: 8,
    },
    packsCard: {
      borderRadius: 16,
      borderWidth: 1,
      overflow: 'hidden',
      marginBottom: 16,
    },
    packRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    packCredits: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 15,
    },
    packPrice: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 15,
    },
    pricingFooter: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 12,
      textAlign: 'center',
    },
  });
}
