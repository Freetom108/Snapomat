import { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  Share,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import {
  useFonts,
  DMSans_400Regular,
  DMSans_700Bold,
  DMSans_800ExtraBold,
  DMSans_900Black,
} from '@expo-google-fonts/dm-sans';
import { useTheme } from '../../hooks/useTheme';
import { THEMES } from '../../constants/colors';
import { setLocale, SUPPORTED_LOCALES } from '../../i18n';
import {
  getBudget,
  saveBudget,
  getBudgetWarning,
  saveBudgetWarning,
  getCredits,
  getExpenses,
  getLocale,
  saveLocale,
  clearAllData,
  exportData,
  importData,
  getTheme,
} from '../../store/storage';
import {
  formatCurrency,
  formatMonthLabel,
  getMonthExpenses,
} from '../../utils/expenseHelpers';

const LOCALE_LABELS = {
  de: 'Deutsch',
  en: 'English',
  fr: 'Français',
  es: 'Español',
  it: 'Italiano',
  pt: 'Português',
  tr: 'Türkçe',
  pl: 'Polski',
};

const WARNING_STEPS = [50, 60, 70, 80, 90];
const BUDGET_QUICK_ROW = [500, 1000, 1500, 2000];
const BUDGET_QUICK_CENTER = 3000;
const PRICING_SHEET_MAX_HEIGHT = Dimensions.get('window').height * 0.9;

function formatQuickBudget(amount) {
  return amount.toLocaleString('de-DE');
}

function parseBudgetInput(value) {
  const cleaned = String(value).replace(/\./g, '').replace(',', '.').trim();
  return parseFloat(cleaned) || 0;
}

const THEME_OPTIONS = [
  { id: 'midnightGold', color: '#E8B84B' },
  { id: 'forestGreen', color: '#2d6a3f' },
  { id: 'burgundy', color: '#7a1c1c' },
  { id: 'midnightBlue', color: '#1a3a6a' },
  { id: 'light', color: '#F2F1EC', borderColor: '#666666' },
];

function snapWarning(value) {
  const clamped = Math.max(50, Math.min(90, Number(value) || 80));
  return WARNING_STEPS.reduce((prev, step) =>
    Math.abs(step - clamped) < Math.abs(prev - clamped) ? step : prev,
  );
}

function withAlpha(hex, alpha) {
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
}

function SettingsRow({
  emoji,
  title,
  subtitle,
  onPress,
  showChevron = true,
  last = false,
  colors,
  styles,
}) {
  const content = (
    <>
      <View style={[styles.iconBox, { backgroundColor: withAlpha(colors.dim, 0.35) }]}>
        <Text style={styles.iconEmoji}>{emoji}</Text>
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, { color: colors.text }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.rowSubtitle, { color: colors.muted }]}>{subtitle}</Text>
        ) : null}
      </View>
      {showChevron ? <Text style={[styles.chevron, { color: colors.dim }]}>›</Text> : null}
    </>
  );

  if (!onPress) {
    return <View style={[styles.row, !last && styles.rowBorder]}>{content}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !last && styles.rowBorder,
        pressed && { opacity: 0.75 },
      ]}
    >
      {content}
    </Pressable>
  );
}

function BudgetModalSlider({ value, onChange, colors, styles }) {
  const [trackWidth, setTrackWidth] = useState(0);
  const min = WARNING_STEPS[0];
  const max = WARNING_STEPS[WARNING_STEPS.length - 1];
  const ratio = (value - min) / (max - min);

  function updateFromX(x) {
    if (!trackWidth) return;
    const clamped = Math.max(0, Math.min(1, x / trackWidth));
    const raw = min + clamped * (max - min);
    onChange(snapWarning(raw));
  }

  return (
    <View style={styles.budgetSliderSection}>
      <Text style={[styles.budgetSliderActive, { color: colors.accent }]}>{value}%</Text>

      <View style={styles.budgetSliderSteps}>
        {WARNING_STEPS.map((step) => {
          const isActive = step === value;
          return (
            <Pressable key={step} onPress={() => onChange(step)} style={styles.budgetSliderStepHit}>
              <Text
                style={[
                  styles.budgetSliderStepLabel,
                  { color: isActive ? colors.accent : colors.muted },
                ]}
              >
                {step}%
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
        onPress={(event) => updateFromX(event.nativeEvent.locationX)}
        style={[styles.sliderTrack, { backgroundColor: colors.border }]}
      >
        <View
          style={[
            styles.sliderFill,
            { backgroundColor: colors.accent, width: `${ratio * 100}%` },
          ]}
        />
        <View
          style={[
            styles.sliderThumb,
            {
              backgroundColor: colors.accent,
              left: Math.max(0, ratio * trackWidth - 9),
            },
          ]}
        />
      </Pressable>

      <View style={styles.sliderLabels}>
        <Text style={[styles.sliderLabel, { color: colors.muted }]}>früher</Text>
        <Text style={[styles.sliderLabel, { color: colors.muted }]}>später</Text>
      </View>
    </View>
  );
}

function BudgetModal({
  visible,
  budgetInput,
  setBudgetInput,
  warningValue,
  onWarningChange,
  onSave,
  onClose,
  colors,
  styles,
  themeId,
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={() => {}}>
      <View style={styles.pricingOverlay}>
        <View style={[styles.budgetSheet, { backgroundColor: colors.card }]}>
          <View style={styles.pricingSheetHeader}>
            <View style={styles.pricingHeaderText}>
              <Text style={[styles.pricingHeaderTitle, { color: colors.text }]}>
                🎯 Monatsbudget
              </Text>
              <Text style={[styles.budgetModalSubtitle, { color: colors.muted }]}>
                Wie viel möchtest du pro Monat ausgeben?{'\n'}
                Du wirst bei {warningValue}% gewarnt.
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={({ pressed }) => [
                styles.pricingCloseButton,
                pressed && { opacity: 0.7 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Schließen"
            >
              <Text style={[styles.pricingCloseText, { color: colors.muted }]}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.budgetModalScroll}
            keyboardShouldPersistTaps="handled"
          >
            <View
              style={[
                styles.budgetInputWrap,
                { borderColor: colors.accent, backgroundColor: colors.background },
              ]}
            >
              <Text style={[styles.budgetEuro, { color: colors.muted }]}>€</Text>
              <TextInput
                value={budgetInput}
                onChangeText={setBudgetInput}
                keyboardType="decimal-pad"
                placeholder="1.000"
                placeholderTextColor={colors.muted}
                style={[styles.budgetAmountInput, { color: colors.text }]}
              />
            </View>

            <View style={styles.quickBudgetRow}>
              {BUDGET_QUICK_ROW.map((amount) => (
                <Pressable
                  key={amount}
                  onPress={() => setBudgetInput(formatQuickBudget(amount))}
                  style={({ pressed }) => [
                    styles.quickBudgetButton,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.quickBudgetText, { color: colors.text }]}>
                    {formatQuickBudget(amount)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.quickBudgetCenterRow}>
              <Pressable
                onPress={() => setBudgetInput(formatQuickBudget(BUDGET_QUICK_CENTER))}
                style={({ pressed }) => [
                  styles.quickBudgetButton,
                  styles.quickBudgetButtonCenter,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Text style={[styles.quickBudgetText, { color: colors.text }]}>
                  {formatQuickBudget(BUDGET_QUICK_CENTER)}
                </Text>
              </Pressable>
            </View>

            <BudgetModalSlider
              value={warningValue}
              onChange={onWarningChange}
              colors={colors}
              styles={styles}
            />

            <Pressable
              onPress={onSave}
              style={({ pressed }) => [
                styles.budgetSaveButton,
                { backgroundColor: colors.accent, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text
                style={[
                  styles.modalButtonText,
                  { color: themeId === 'light' ? colors.text : colors.background },
                ]}
              >
                Speichern
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function ThemeDots({ themeId, onSelect, colors, styles }) {
  return (
    <View style={[styles.themeDotsWrap, { borderTopColor: colors.border }]}>
      <View style={styles.themeDots}>
        {THEME_OPTIONS.map((option) => {
          const isActive = themeId === option.id;
          return (
            <Pressable key={option.id} onPress={() => onSelect(option.id)}>
              <View
                style={[
                  styles.themeDot,
                  {
                    backgroundColor: option.color,
                    borderColor: isActive
                      ? colors.accent
                      : (option.borderColor ?? 'transparent'),
                    borderWidth: isActive || option.borderColor ? 2 : 0,
                  },
                ]}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function formatError(error) {
  if (!error) return 'Unbekannter Fehler';
  if (typeof error === 'string') return error;
  if (error.message) return error.message;
  return String(error);
}

function BackupRestoreModal({ visible, onClose, onCreateBackup, onRestoreBackup, busy, colors, styles }) {
  return (
    <ModalSheet visible={visible} title="Backup & Restore" onClose={onClose} colors={colors} styles={styles}>
      <Text style={[styles.backupHint, { color: colors.muted }]}>
        Deine Ausgaben, Budget und Einstellungen werden gesichert.
      </Text>

      <Pressable
        onPress={onCreateBackup}
        disabled={busy}
        style={({ pressed }) => [
          styles.backupActionButton,
          { backgroundColor: colors.background, borderColor: colors.border, opacity: busy ? 0.6 : 1 },
          pressed && !busy && { opacity: 0.8 },
        ]}
      >
        <Text style={[styles.backupActionText, { color: colors.text }]}>📤 Backup erstellen</Text>
      </Pressable>

      <Pressable
        onPress={onRestoreBackup}
        disabled={busy}
        style={({ pressed }) => [
          styles.backupActionButton,
          { backgroundColor: colors.background, borderColor: colors.border, opacity: busy ? 0.6 : 1 },
          pressed && !busy && { opacity: 0.8 },
        ]}
      >
        <Text style={[styles.backupActionText, { color: colors.text }]}>📥 Backup wiederherstellen</Text>
      </Pressable>

      {busy ? <ActivityIndicator color={colors.accent} style={styles.backupSpinner} /> : null}
    </ModalSheet>
  );
}

function resolveImportThemeId(stored) {
  if (stored && THEMES[stored]) return stored;
  if (stored === 'gold') return 'midnightGold';
  return 'midnightGold';
}

function ModalSheet({ visible, title, onClose, colors, styles, children }) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={[styles.modalSheet, { backgroundColor: colors.card }]} onPress={() => {}}>
          <View style={styles.modalHandle} />
          <Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function PlanFeature({ text, colors, styles, compactBottom = false }) {
  return (
    <Text
      style={[
        styles.planFeature,
        compactBottom && styles.planFeatureCompactBottom,
        { color: colors.muted },
      ]}
    >
      {text}
    </Text>
  );
}

function PlanFeatureSubline({ text, colors, styles }) {
  return <Text style={[styles.planFeatureSub, { color: colors.muted }]}>{text}</Text>;
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

function CreditsPricingSheet({ visible, credits, onClose, colors, styles }) {
  const packs = [
    { credits: '100 Credits', price: '1,99 €' },
    { credits: '500 Credits', price: '7,99 €' },
    { credits: '1.000 Credits', price: '12,99 €' },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={() => {}}
    >
      <View style={styles.pricingOverlay}>
        <View style={[styles.pricingSheet, { backgroundColor: colors.card }]}>
          <View style={styles.pricingSheetHeader}>
            <View style={styles.pricingHeaderText}>
              <Text style={[styles.pricingHeaderTitle, { color: colors.text }]}>
                ⚡ Abo & Credits
              </Text>
              <Text style={[styles.pricingHeaderSubtitle, { color: colors.muted }]}>
                Du hast noch {credits} Credits.
              </Text>
              <Text style={[styles.pricingHeaderHint, { color: colors.muted }]}>
                1 Credit pro KI-Analyse.
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={({ pressed }) => [
                styles.pricingCloseButton,
                pressed && { opacity: 0.7 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Schließen"
            >
              <Text style={[styles.pricingCloseText, { color: colors.muted }]}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.pricingScrollView}
            contentContainerStyle={styles.pricingScroll}
            showsVerticalScrollIndicator
            bounces
            nestedScrollEnabled
          >
            <PlanCard name="Free" price="0 €" colors={colors} styles={styles}>
              <Text style={[styles.planSectionLabel, { color: colors.muted }]}>MONAT 1</Text>
              <PlanFeature
                text="⚡ 20 KI-Credits · 1 Credit pro Analyse"
                colors={colors}
                styles={styles}
              />
              <PlanFeature
                text="✏️ Unbegrenzte manuelle Einträge"
                colors={colors}
                styles={styles}
              />
              <Text style={[styles.planSectionLabel, styles.planSectionLabelSpaced, { color: colors.muted }]}>
                AB MONAT 2
              </Text>
              <PlanFeature
                text="⚡ KI-Analysen flexibel per Credit-Paket verfügbar"
                colors={colors}
                styles={styles}
              />
              <PlanFeature
                text="✏️ 10 manuelle Einträge pro Monat gratis"
                colors={colors}
                styles={styles}
              />
            </PlanCard>

            <PlanCard name="Monthly" price="3,99 € / Monat" colors={colors} styles={styles}>
              <PlanFeature
                text="⚡ 100 KI-Credits pro Monat"
                colors={colors}
                styles={styles}
              />
              <PlanFeature
                text="✏️ Unbegrenzte manuelle Einträge"
                colors={colors}
                styles={styles}
              />
              <PlanFeature
                text="∞ Credits verfallen nie · nicht verbrauchte Credits bleiben erhalten"
                colors={colors}
                styles={styles}
              />
              <Text style={[styles.planFootnote, { color: colors.muted }]}>Jederzeit kündbar</Text>
            </PlanCard>

            <PlanCard
              name="Yearly"
              price="19,99 € / Jahr"
              badge="-58%"
              featured
              colors={colors}
              styles={styles}
            >
              <PlanFeature
                text="⚡ 1.500 KI-Credits pro Jahr"
                colors={colors}
                styles={styles}
                compactBottom
              />
              <PlanFeatureSubline
                text="nur 1,67 €/Monat"
                colors={colors}
                styles={styles}
              />
              <PlanFeature
                text="✏️ Unbegrenzte manuelle Einträge"
                colors={colors}
                styles={styles}
              />
              <PlanFeature
                text="∞ Credits verfallen nie · nicht verbrauchte Credits bleiben erhalten"
                colors={colors}
                styles={styles}
              />
            </PlanCard>

            <Text style={[styles.packsSectionLabel, { color: colors.muted }]}>ZUSATZPAKETE</Text>
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
              Einmalige Zahlung · Kein Abo
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      paddingHorizontal: 20,
      paddingTop: 50,
      paddingBottom: 32,
    },
    header: {
      marginBottom: 20,
    },
    brand: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 11,
      color: colors.muted,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
    },
    screenTitle: {
      fontFamily: 'DMSans_900Black',
      fontSize: 26,
      color: colors.text,
      marginTop: 4,
    },
    sectionLabel: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 11,
      color: colors.muted,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      marginBottom: 8,
    },
    sectionLabelDanger: {
      color: colors.red,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      overflow: 'hidden',
      marginBottom: 20,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 12,
    },
    rowBorder: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    iconBox: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconEmoji: {
      fontSize: 18,
    },
    rowText: {
      flex: 1,
      gap: 2,
    },
    rowTitle: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 17,
    },
    rowSubtitle: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 12,
    },
    chevron: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 22,
      lineHeight: 24,
    },
    sliderTrack: {
      height: 6,
      borderRadius: 3,
      justifyContent: 'center',
    },
    sliderFill: {
      height: 6,
      borderRadius: 3,
    },
    sliderThumb: {
      position: 'absolute',
      width: 18,
      height: 18,
      borderRadius: 9,
      top: -6,
    },
    sliderLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 8,
    },
    sliderLabel: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 12,
    },
    budgetSheet: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: PRICING_SHEET_MAX_HEIGHT,
      width: '100%',
    },
    budgetModalScroll: {
      paddingHorizontal: 20,
      paddingBottom: 32,
    },
    budgetModalSubtitle: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 14,
      lineHeight: 20,
      marginTop: 4,
    },
    budgetInputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 2,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 14,
      marginBottom: 16,
    },
    budgetEuro: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 22,
      marginRight: 8,
    },
    budgetAmountInput: {
      flex: 1,
      fontFamily: 'DMSans_800ExtraBold',
      fontSize: 24,
      textAlign: 'center',
      paddingVertical: 0,
    },
    quickBudgetRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 8,
    },
    quickBudgetCenterRow: {
      alignItems: 'center',
      marginBottom: 24,
    },
    quickBudgetButton: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
    },
    quickBudgetButtonCenter: {
      flex: 0,
      minWidth: 120,
      paddingHorizontal: 24,
    },
    quickBudgetText: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 14,
    },
    budgetSliderSection: {
      marginBottom: 24,
    },
    budgetSliderActive: {
      fontFamily: 'DMSans_800ExtraBold',
      fontSize: 17,
      textAlign: 'center',
      marginBottom: 8,
    },
    budgetSliderSteps: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    budgetSliderStepHit: {
      flex: 1,
      alignItems: 'center',
    },
    budgetSliderStepLabel: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 11,
    },
    budgetSaveButton: {
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
    },
    themeDotsWrap: {
      borderTopWidth: 1,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    themeDots: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    themeDot: {
      width: 24,
      height: 24,
      borderRadius: 12,
    },
    dangerButton: {
      marginHorizontal: 16,
      marginVertical: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.red,
      paddingVertical: 14,
      alignItems: 'center',
    },
    dangerButtonText: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 15,
      color: colors.red,
    },
    footer: {
      alignItems: 'center',
      marginTop: 4,
      gap: 4,
    },
    footerBrand: {
      fontFamily: 'DMSans_800ExtraBold',
      fontSize: 12,
      color: colors.accent,
      letterSpacing: 2,
    },
    footerVersion: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 12,
      color: colors.muted,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingBottom: 32,
      paddingTop: 12,
    },
    pricingOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end',
    },
    pricingSheet: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: PRICING_SHEET_MAX_HEIGHT,
      width: '100%',
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
    pricingScrollView: {
      flexGrow: 0,
      flexShrink: 1,
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
    pricingHeaderHint: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 12,
      lineHeight: 17,
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
    planSectionLabel: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 10,
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginBottom: 6,
    },
    planSectionLabelSpaced: {
      marginTop: 12,
    },
    planFeature: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 13,
      lineHeight: 19,
      marginBottom: 4,
    },
    planFeatureCompactBottom: {
      marginBottom: 2,
    },
    planFeatureSub: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 13,
      lineHeight: 18,
      marginBottom: 4,
      paddingLeft: 22,
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
      marginTop: 8,
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
    modalHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.muted,
      alignSelf: 'center',
      marginBottom: 16,
    },
    modalTitle: {
      fontFamily: 'DMSans_900Black',
      fontSize: 20,
      marginBottom: 16,
    },
    modalRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      borderBottomWidth: 1,
    },
    modalRowText: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 16,
    },
    modalButton: {
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 4,
    },
    modalButtonText: {
      fontFamily: 'DMSans_900Black',
      fontSize: 16,
    },
    modalClose: {
      alignItems: 'center',
      paddingVertical: 12,
      marginTop: 8,
    },
    modalCloseText: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 15,
    },
    backupHint: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 16,
    },
    backupActionButton: {
      borderRadius: 14,
      borderWidth: 1,
      paddingVertical: 16,
      paddingHorizontal: 16,
      marginBottom: 12,
    },
    backupActionText: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 16,
      textAlign: 'center',
    },
    backupSpinner: {
      marginTop: 8,
    },
  });
}

export default function SettingsScreen() {
  const { colors, themeId, setTheme, ready: themeReady } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [budget, setBudgetState] = useState(1000);
  const [budgetWarning, setBudgetWarningState] = useState(80);
  const [credits, setCreditsState] = useState(5);
  const [locale, setLocaleState] = useState('de');
  const [loading, setLoading] = useState(true);

  const [showPricing, setShowPricing] = useState(false);
  const [showLanguage, setShowLanguage] = useState(false);
  const [showBudget, setShowBudget] = useState(false);
  const [budgetWarningDraft, setBudgetWarningDraft] = useState(80);
  const [showBackup, setShowBackup] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);
  const [budgetInput, setBudgetInput] = useState('1000');

  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_700Bold,
    DMSans_800ExtraBold,
    DMSans_900Black,
  });

  const loadSettings = useCallback(async () => {
    const [storedBudget, storedWarning, storedCredits, storedLocale] = await Promise.all([
      getBudget(),
      getBudgetWarning(),
      getCredits(),
      getLocale(),
    ]);
    setBudgetState(storedBudget);
    setBudgetWarningState(snapWarning(storedWarning));
    setCreditsState(storedCredits);
    setLocaleState(storedLocale);
    setBudgetInput(String(storedBudget));
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [loadSettings]),
  );

  async function handleBudgetWarningChange(value) {
    setBudgetWarningDraft(snapWarning(value));
  }

  async function handleSaveBudget() {
    const amount = parseBudgetInput(budgetInput) || 1000;
    const warning = snapWarning(budgetWarningDraft);
    await saveBudget(amount);
    await saveBudgetWarning(warning);
    setBudgetState(amount);
    setBudgetWarningState(warning);
    setShowBudget(false);
  }

  function openBudgetModal() {
    setBudgetInput(formatQuickBudget(budget));
    setBudgetWarningDraft(budgetWarning);
    setShowBudget(true);
  }

  async function handleLanguageSelect(code) {
    await setLocale(code);
    await saveLocale(code);
    setLocaleState(code);
    setShowLanguage(false);
  }

  async function handleShareReport() {
    const now = new Date();
    const expenses = await getExpenses();
    const monthExpenses = getMonthExpenses(expenses, now.getFullYear(), now.getMonth());
    const total = monthExpenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const label = formatMonthLabel(now.getFullYear(), now.getMonth());

    await Share.share({
      message: `Snapomat Monatsbericht – ${label}\nAusgaben: ${formatCurrency(total)}\nBuchungen: ${monthExpenses.length}`,
    });
  }

  async function handleCreateBackup() {
    if (backupBusy) return;
    setBackupBusy(true);
    try {
      if (!FileSystem.cacheDirectory) {
        throw new Error('FileSystem.cacheDirectory ist auf diesem Gerät nicht verfügbar.');
      }

      const json = await exportData();
      const fileName = `snapomat-backup-${new Date().toISOString().slice(0, 10)}.json`;
      const uri = `${FileSystem.cacheDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(uri, json, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert(
          'Backup erstellt',
          `Datei gespeichert, Teilen ist hier nicht verfügbar.\n\n${uri}`,
        );
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: 'application/json',
        dialogTitle: 'Snapomat Backup teilen',
        UTI: 'public.json',
      });
    } catch (error) {
      Alert.alert('Fehler', formatError(error));
    } finally {
      setBackupBusy(false);
    }
  }

  async function handleRestoreBackup() {
    if (backupBusy) return;

    Alert.alert(
      'Backup wiederherstellen?',
      'Bestehende Daten werden durch das Backup ersetzt.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Fortfahren',
          onPress: async () => {
            setBackupBusy(true);
            try {
              const result = await DocumentPicker.getDocumentAsync({
                type: 'application/json',
                copyToCacheDirectory: true,
              });

              if (result.canceled || !result.assets?.[0]?.uri) {
                return;
              }

              const jsonString = await FileSystem.readAsStringAsync(result.assets[0].uri, {
                encoding: FileSystem.EncodingType.UTF8,
              });
              const success = await importData(jsonString);

              if (!success) {
                Alert.alert('Fehler', 'Backup konnte nicht importiert werden (ungültiges JSON).');
                return;
              }

              const [storedLocale, storedTheme] = await Promise.all([getLocale(), getTheme()]);
              await setLocale(storedLocale);
              await setTheme(resolveImportThemeId(storedTheme));
              await loadSettings();
              setShowBackup(false);
              Alert.alert('Erfolg', 'Backup wurde wiederhergestellt.');
            } catch (error) {
              Alert.alert('Fehler', formatError(error));
            } finally {
              setBackupBusy(false);
            }
          },
        },
      ],
    );
  }

  function handleInfo(title) {
    Alert.alert(title, 'Diese Funktion folgt in einer späteren Version.');
  }

  function handleDeleteAll() {
    Alert.alert(
      'Alle App-Daten löschen?',
      'Ausgaben, Budget und Einstellungen werden unwiderruflich gelöscht.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: async () => {
            await clearAllData();
            await loadSettings();
            Alert.alert('Gelöscht', 'Alle App-Daten wurden entfernt.');
          },
        },
      ],
    );
  }

  if (!fontsLoaded || !themeReady || loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.brand}>SNAPOMAT</Text>
          <Text style={styles.screenTitle}>Settings</Text>
        </View>

        <Text style={styles.sectionLabel}>ABO</Text>
        <View style={styles.card}>
          <SettingsRow
            emoji="⚡"
            title="Abo & Credits"
            onPress={() => setShowPricing(true)}
            last
            colors={colors}
            styles={styles}
          />
        </View>

        <Text style={styles.sectionLabel}>BUDGET</Text>
        <View style={styles.card}>
          <SettingsRow
            emoji="🎯"
            title="Monatsbudget festlegen"
            subtitle={formatCurrency(budget)}
            onPress={openBudgetModal}
            last
            colors={colors}
            styles={styles}
          />
        </View>

        <Text style={styles.sectionLabel}>BERICHTE</Text>
        <View style={styles.card}>
          <SettingsRow
            emoji="📤"
            title="Monatsbericht teilen"
            subtitle="Als PDF verschicken"
            onPress={handleShareReport}
            colors={colors}
            styles={styles}
          />
          <SettingsRow
            emoji="💾"
            title="Backup & Restore"
            subtitle="Daten sichern & wiederherstellen"
            onPress={() => setShowBackup(true)}
            last
            colors={colors}
            styles={styles}
          />
        </View>

        <Text style={styles.sectionLabel}>DARSTELLUNG</Text>
        <View style={styles.card}>
          <SettingsRow
            emoji="🌍"
            title="Sprache"
            subtitle={LOCALE_LABELS[locale] ?? locale}
            onPress={() => setShowLanguage(true)}
            colors={colors}
            styles={styles}
          />
          <SettingsRow
            emoji="🎨"
            title="Farbschema"
            subtitle={THEMES[themeId]?.name ?? 'Theme'}
            showChevron={false}
            colors={colors}
            styles={styles}
          />
          <ThemeDots
            themeId={themeId}
            onSelect={setTheme}
            colors={colors}
            styles={styles}
          />
        </View>

        <Text style={styles.sectionLabel}>ÜBER SNAPOMAT</Text>
        <View style={styles.card}>
          <SettingsRow
            emoji="📱"
            title="Über die App"
            subtitle="Version 1.0 · Free"
            onPress={() => handleInfo('Über die App')}
            colors={colors}
            styles={styles}
          />
          <SettingsRow
            emoji="❓"
            title="FAQ"
            subtitle="Häufige Fragen"
            onPress={() => handleInfo('FAQ')}
            colors={colors}
            styles={styles}
          />
          <SettingsRow
            emoji="💬"
            title="Support & Feedback"
            subtitle="Kontakt · Bewerten"
            onPress={() => handleInfo('Support & Feedback')}
            colors={colors}
            styles={styles}
          />
          <SettingsRow
            emoji="🛡️"
            title="Rechtliches"
            subtitle="Datenschutz · Impressum"
            onPress={() => handleInfo('Rechtliches')}
            last
            colors={colors}
            styles={styles}
          />
        </View>

        <Text style={[styles.sectionLabel, styles.sectionLabelDanger]}>GEFAHRENZONE</Text>
        <View style={styles.card}>
          <Pressable
            onPress={handleDeleteAll}
            style={({ pressed }) => [styles.dangerButton, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.dangerButtonText}>🗑 Alle App-Daten löschen</Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerBrand}>SNAPOMAT</Text>
          <Text style={styles.footerVersion}>Version 1.0 MVP</Text>
        </View>
      </ScrollView>

      <CreditsPricingSheet
        visible={showPricing}
        credits={credits}
        onClose={() => setShowPricing(false)}
        colors={colors}
        styles={styles}
      />

      <BackupRestoreModal
        visible={showBackup}
        onClose={() => !backupBusy && setShowBackup(false)}
        onCreateBackup={handleCreateBackup}
        onRestoreBackup={handleRestoreBackup}
        busy={backupBusy}
        colors={colors}
        styles={styles}
      />

      <ModalSheet
        visible={showLanguage}
        title="Sprache"
        onClose={() => setShowLanguage(false)}
        colors={colors}
        styles={styles}
      >
        {SUPPORTED_LOCALES.map((code, index) => (
          <Pressable
            key={code}
            onPress={() => handleLanguageSelect(code)}
            style={[
              styles.modalRow,
              {
                borderBottomColor: colors.border,
                borderBottomWidth: index < SUPPORTED_LOCALES.length - 1 ? 1 : 0,
              },
            ]}
          >
            <Text style={[styles.modalRowText, { color: colors.text }]}>
              {LOCALE_LABELS[code]}
            </Text>
            {locale === code ? (
              <Text style={{ color: colors.accent, fontSize: 18 }}>✓</Text>
            ) : null}
          </Pressable>
        ))}
      </ModalSheet>

      <BudgetModal
        visible={showBudget}
        budgetInput={budgetInput}
        setBudgetInput={setBudgetInput}
        warningValue={budgetWarningDraft}
        onWarningChange={handleBudgetWarningChange}
        onSave={handleSaveBudget}
        onClose={() => setShowBudget(false)}
        colors={colors}
        styles={styles}
        themeId={themeId}
      />
    </>
  );
}
