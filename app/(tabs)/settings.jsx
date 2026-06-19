import { useCallback, useEffect, useMemo, useState } from 'react';
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
  Linking,
  ActivityIndicator,
  Dimensions,
  Clipboard,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
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
import { resolveThemeId } from '../../constants/colors';
import { setLocale } from '../../i18n';
import { useTranslation } from '../../hooks/useTranslation';
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
  getUserId,
  formatUserIdDisplay,
  getHistorySelectedMonth,
} from '../../store/storage';
import {
  buildMonthlyShareReport,
  getMonthExpenses,
} from '../../utils/expenseHelpers';
import CreditsPricingSheet from '../../components/CreditsPricingSheet';

const LOCALE_OPTIONS = [
  { code: 'auto', flag: '🌍' },
  { code: 'de', flag: '🇩🇪' },
  { code: 'en', flag: '🇬🇧' },
  { code: 'fr', flag: '🇫🇷' },
  { code: 'es', flag: '🇪🇸' },
  { code: 'it', flag: '🇮🇹' },
  { code: 'pt', flag: '🇵🇹' },
  { code: 'tr', flag: '🇹🇷' },
  { code: 'pl', flag: '🇵🇱' },
  { code: 'nl', flag: '🇳🇱' },
  { code: 'ja', flag: '🇯🇵' },
];

function getLocaleLabel(code, t) {
  return t(`settings.locales.${code}`);
}

const WARNING_STEPS = [50, 60, 70, 80, 90];
const BUDGET_QUICK_ROW = [500, 1000, 1500, 2000];
const BUDGET_QUICK_CENTER = 3000;
const PRICING_SHEET_MAX_HEIGHT = Dimensions.get('window').height * 0.9;
const SHEET_MIN_HEIGHT = Dimensions.get('window').height * 0.35;

function formatQuickBudget(amount) {
  return amount.toLocaleString('de-DE');
}

function parseBudgetInput(value) {
  const cleaned = String(value).replace(/\./g, '').replace(',', '.').trim();
  return parseFloat(cleaned) || 0;
}

const THEME_OPTIONS = [
  { id: 'gold', color: '#E8B84B' },
  { id: 'forest', color: '#2d6a3f' },
  { id: 'burgundy', color: '#7a1c1c' },
  { id: 'blue', color: '#1a3a6a' },
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
  const { t } = useTranslation();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={() => {}}>
      <View style={styles.pricingOverlay}>
        <View style={[styles.bottomSheet, { backgroundColor: colors.card }]}>
          <View style={styles.pricingSheetHeader}>
            <View style={styles.pricingHeaderText}>
              <Text style={[styles.pricingHeaderTitle, { color: colors.text }]}>
                {t('settings.budgetModalTitle')}
              </Text>
              <Text style={[styles.budgetModalSubtitle, { color: colors.muted }]}>
                {t('settings.budgetModalLine1')}{'\n'}
                {t('settings.budgetModalLine2', { percent: warningValue })}
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
              accessibilityLabel={t('common.close')}
            >
              <Text style={[styles.pricingCloseText, { color: colors.muted }]}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.bottomSheetScroll}
            showsVerticalScrollIndicator
            contentContainerStyle={styles.budgetModalScroll}
            keyboardShouldPersistTaps="handled"
            bounces
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
                placeholder={t('settings.budgetPlaceholder')}
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
                {t('common.save')}
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
                      ? '#FFFFFF'
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

const FAQ_ITEM_META = [
  { id: 'ai' },
  { id: 'intro', action: 'onboarding', link: true },
  { id: 'upgrade', action: 'pricing', link: true },
  { id: 'monthlyYearly' },
  { id: 'data' },
  { id: 'trialAfterData' },
  { id: 'scanCost' },
  { id: 'creditsBuy' },
  { id: 'budget' },
  { id: 'backup' },
  { id: 'fixedCosts' },
  { id: 'entryLimit' },
];

function formatError(error, t) {
  if (!error) return t('common.unknownError');
  if (typeof error === 'string') return error;
  if (error.message) return error.message;
  return String(error);
}

function LanguageModal({ visible, locale, onSelect, onClose, colors, styles }) {
  const { t } = useTranslation();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={() => {}}>
      <View style={styles.pricingOverlay}>
        <View style={[styles.bottomSheet, { backgroundColor: colors.card }]}>
          <View style={styles.pricingSheetHeader}>
            <View style={styles.pricingHeaderText}>
              <Text style={[styles.pricingHeaderTitle, { color: colors.text }]}>
                {t('settings.languageModalTitle')}
              </Text>
              <Text style={[styles.languageModalHint, { color: colors.muted }]}>
                {t('settings.languageModalHint')}
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
              accessibilityLabel={t('common.close')}
            >
              <Text style={[styles.pricingCloseText, { color: colors.muted }]}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.bottomSheetScroll}
            showsVerticalScrollIndicator
            contentContainerStyle={styles.languageList}
            bounces
          >
            {LOCALE_OPTIONS.map((option, index) => {
              const isActive = locale === option.code;
              return (
                <Pressable
                  key={option.code}
                  onPress={() => onSelect(option.code)}
                  style={({ pressed }) => [
                    styles.languageRow,
                    {
                      borderBottomColor: colors.border,
                      borderBottomWidth: index < LOCALE_OPTIONS.length - 1 ? 1 : 0,
                      opacity: pressed ? 0.75 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.languageRowText, { color: colors.text }]}>
                    {option.flag} {getLocaleLabel(option.code, t)}
                  </Text>
                  {isActive ? (
                    <Text style={[styles.languageCheck, { color: colors.accent }]}>✓</Text>
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function FaqModal({ visible, onClose, onAction, colors, styles }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(() => new Set());

  useEffect(() => {
    if (!visible) {
      setExpanded(new Set());
    }
  }, [visible]);

  function toggleItem(id) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handlePress(item) {
    if (item.action) {
      onAction(item.action);
      return;
    }
    toggleItem(item.id);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={() => {}}>
      <View style={styles.pricingOverlay}>
        <View style={[styles.bottomSheet, { backgroundColor: colors.card }]}>
          <View style={styles.pricingSheetHeader}>
            <View style={styles.pricingHeaderText}>
              <Text style={[styles.pricingHeaderTitle, { color: colors.text }]}>
                {t('settings.faqTitle')}
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
              accessibilityLabel={t('common.close')}
            >
              <Text style={[styles.pricingCloseText, { color: colors.muted }]}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.bottomSheetScroll}
            showsVerticalScrollIndicator
            contentContainerStyle={styles.faqList}
            bounces
          >
            {FAQ_ITEM_META.map((item, index) => {
              const isExpanded = expanded.has(item.id);
              const isLink = !!item.link;
              const question = t(`settings.faq.${item.id}.question`);
              const answer = isLink ? null : t(`settings.faq.${item.id}.answer`);

              return (
                <View
                  key={item.id}
                  style={[
                    styles.faqItem,
                    {
                      borderBottomColor: colors.border,
                      borderBottomWidth: index < FAQ_ITEM_META.length - 1 ? 1 : 0,
                    },
                  ]}
                >
                  <Pressable
                    onPress={() => handlePress(item)}
                    style={({ pressed }) => [
                      styles.faqQuestionRow,
                      pressed && { opacity: 0.75 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.faqQuestion,
                        { color: isLink ? colors.accent : colors.text },
                      ]}
                    >
                      {question}
                    </Text>
                    <Text
                      style={[
                        styles.faqChevron,
                        { color: isLink ? colors.accent : colors.muted },
                      ]}
                    >
                      {isLink ? '›' : isExpanded ? '▾' : '▸'}
                    </Text>
                  </Pressable>
                  {!isLink && isExpanded ? (
                    <Text style={[styles.faqAnswer, { color: colors.muted }]}>
                      {answer}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function InfoSheetModal({ visible, title, onClose, colors, styles, children }) {
  const { t } = useTranslation();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={() => {}}>
      <View style={styles.pricingOverlay}>
        <View style={[styles.bottomSheet, { backgroundColor: colors.card }]}>
          <View style={styles.pricingSheetHeader}>
            <View style={styles.pricingHeaderText}>
              <Text style={[styles.pricingHeaderTitle, { color: colors.text }]}>{title}</Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={({ pressed }) => [
                styles.pricingCloseButton,
                pressed && { opacity: 0.7 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
            >
              <Text style={[styles.pricingCloseText, { color: colors.muted }]}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.bottomSheetScroll}
            showsVerticalScrollIndicator
            contentContainerStyle={styles.infoSheetList}
            bounces
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function InfoSheetRow({
  label,
  value,
  valueColor,
  valueStyle,
  labelColor,
  onPress,
  isLast = false,
  colors,
  styles,
}) {
  const rowStyle = [
    styles.infoSheetRow,
    {
      borderBottomColor: colors.border,
      borderBottomWidth: isLast ? 0 : 1,
    },
  ];

  const content = (
    <>
      <Text
        style={[
          styles.infoSheetLabel,
          { color: labelColor ?? colors.text },
        ]}
      >
        {label}
      </Text>
      {value ? (
        <Text
          style={[
            styles.infoSheetValue,
            { color: valueColor ?? colors.muted },
            valueStyle,
          ]}
        >
          {value}
        </Text>
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [...rowStyle, pressed && { opacity: 0.75 }]}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={rowStyle}>{content}</View>;
}

function UserIdRow({ label, userId, onCopy, colors, styles }) {
  return (
    <View style={[styles.infoSheetRow, { borderBottomWidth: 0 }]}>
      <Text style={[styles.infoSheetLabel, { color: colors.text }]}>{label}</Text>
      <Pressable
        onPress={onCopy}
        style={({ pressed }) => [styles.userIdCopyRow, pressed && { opacity: 0.75 }]}
        accessibilityRole="button"
      >
        <Text
          style={[
            styles.infoSheetValue,
            styles.infoSheetValueMono,
            { color: colors.muted },
          ]}
        >
          {formatUserIdDisplay(userId)}
        </Text>
        <Text style={styles.userIdCopyIcon}>📋</Text>
      </Pressable>
    </View>
  );
}

function AboutAppModal({ visible, onClose, colors, styles }) {
  const { t } = useTranslation();

  return (
    <InfoSheetModal
      visible={visible}
      title={t('settings.aboutModalTitle')}
      onClose={onClose}
      colors={colors}
      styles={styles}
    >
      <InfoSheetRow label={t('settings.aboutAppLabel')} value="Snapomat" colors={colors} styles={styles} />
      <InfoSheetRow label={t('settings.aboutVersionLabel')} value={t('settings.aboutVersionValue')} colors={colors} styles={styles} />
      <InfoSheetRow label={t('settings.aboutStatusLabel')} value="Free" colors={colors} styles={styles} />
      <InfoSheetRow
        label={t('settings.restorePurchases')}
        labelColor={colors.accent}
        onPress={() => Alert.alert(t('settings.alerts.restoringPurchases'))}
        isLast
        colors={colors}
        styles={styles}
      />
    </InfoSheetModal>
  );
}

function SupportFeedbackModal({ visible, onClose, userId, onCopyUserId, colors, styles }) {
  const { t } = useTranslation();

  return (
    <InfoSheetModal
      visible={visible}
      title={t('settings.supportModalTitle')}
      onClose={onClose}
      colors={colors}
      styles={styles}
    >
      <InfoSheetRow
        label={t('settings.supportContactLabel')}
        value={t('common.open')}
        valueColor={colors.accent}
        onPress={() => Linking.openURL('https://freetom108.github.io/Snapomat/support')}
        colors={colors}
        styles={styles}
      />
      <InfoSheetRow
        label={t('settings.supportRateLabel')}
        value={t('common.open')}
        valueColor={colors.accent}
        onPress={() => Alert.alert(t('settings.alerts.thanksRating'))}
        colors={colors}
        styles={styles}
      />
      <UserIdRow
        label={t('settings.supportUserIdLabel')}
        userId={userId}
        onCopy={onCopyUserId}
        colors={colors}
        styles={styles}
      />
    </InfoSheetModal>
  );
}

function LegalModal({ visible, onClose, colors, styles }) {
  const { t } = useTranslation();

  return (
    <InfoSheetModal
      visible={visible}
      title={t('settings.legalModalTitle')}
      onClose={onClose}
      colors={colors}
      styles={styles}
    >
      <InfoSheetRow
        label={t('settings.legalPrivacy')}
        value={t('common.open')}
        valueColor={colors.accent}
        onPress={() => Linking.openURL('https://freetom108.github.io/Snapomat/privacy')}
        colors={colors}
        styles={styles}
      />
      <InfoSheetRow
        label={t('settings.legalTerms')}
        value={t('common.open')}
        valueColor={colors.accent}
        onPress={() => Linking.openURL('https://freetom108.github.io/Snapomat/terms')}
        colors={colors}
        styles={styles}
      />
      <InfoSheetRow
        label={t('settings.legalImprint')}
        value={t('common.open')}
        valueColor={colors.accent}
        onPress={() => Linking.openURL('https://freetom108.github.io/Snapomat/impressum')}
        isLast
        colors={colors}
        styles={styles}
      />
    </InfoSheetModal>
  );
}

function BackupRestoreModal({ visible, onClose, onCreateBackup, onRestoreBackup, busy, colors, styles }) {
  const { t } = useTranslation();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={() => {}}>
      <View style={styles.pricingOverlay}>
        <View style={[styles.bottomSheet, { backgroundColor: colors.card }]}>
          <View style={styles.pricingSheetHeader}>
            <View style={styles.pricingHeaderText}>
              <Text style={[styles.pricingHeaderTitle, { color: colors.text }]}>
                Backup & Restore
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
              accessibilityLabel={t('common.close')}
            >
              <Text style={[styles.pricingCloseText, { color: colors.muted }]}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.bottomSheetScroll}
            showsVerticalScrollIndicator
            contentContainerStyle={styles.infoSheetList}
            bounces
          >
            <Text style={[styles.backupHint, { color: colors.muted }]}>
              {t('settings.backupHint')}
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
              <Text style={[styles.backupActionText, { color: colors.text }]}>
                {t('settings.backupCreate')}
              </Text>
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
              <Text style={[styles.backupActionText, { color: colors.text }]}>
                {t('settings.backupRestore')}
              </Text>
            </Pressable>

            {busy ? <ActivityIndicator color={colors.accent} style={styles.backupSpinner} /> : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function resolveImportThemeId(stored) {
  return resolveThemeId(stored);
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
      color: colors.accent,
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
      gap: 14,
    },
    themeDot: {
      width: 48,
      height: 48,
      borderRadius: 24,
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
    languageList: {
      paddingHorizontal: 20,
      paddingBottom: 32,
    },
    languageModalHint: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 14,
      lineHeight: 20,
      marginTop: 4,
    },
    languageRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 16,
    },
    languageRowText: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 16,
    },
    languageCheck: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 18,
    },
    faqList: {
      paddingHorizontal: 20,
      paddingBottom: 32,
    },
    faqItem: {
      paddingVertical: 4,
    },
    faqQuestionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingVertical: 14,
    },
    faqQuestion: {
      flex: 1,
      fontFamily: 'DMSans_700Bold',
      fontSize: 15,
      lineHeight: 21,
    },
    faqChevron: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 18,
      lineHeight: 20,
    },
    faqAnswer: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 14,
      lineHeight: 21,
      paddingBottom: 14,
    },
    infoSheetList: {
      paddingHorizontal: 20,
      paddingBottom: 32,
    },
    infoSheetRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingVertical: 16,
    },
    infoSheetLabel: {
      flex: 1,
      fontFamily: 'DMSans_400Regular',
      fontSize: 15,
    },
    infoSheetValue: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 15,
      textAlign: 'right',
    },
    infoSheetValueMono: {
      fontFamily: 'monospace',
      fontSize: 13,
    },
    userIdCopyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    userIdCopyIcon: {
      fontSize: 14,
    },
    pricingOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end',
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
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, themeId, setTheme, ready: themeReady } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [budget, setBudgetState] = useState(1000);
  const [budgetWarning, setBudgetWarningState] = useState(80);
  const [credits, setCreditsState] = useState(5);
  const [locale, setLocaleState] = useState('de');
  const [userId, setUserIdState] = useState('');
  const [loading, setLoading] = useState(true);

  const [showPricing, setShowPricing] = useState(false);
  const [showLanguage, setShowLanguage] = useState(false);
  const [showFaq, setShowFaq] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [showLegal, setShowLegal] = useState(false);
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
    const [storedBudget, storedWarning, storedCredits, storedLocale, storedUserId] = await Promise.all([
      getBudget(),
      getBudgetWarning(),
      getCredits(),
      getLocale(),
      getUserId(),
    ]);
    setBudgetState(storedBudget);
    setBudgetWarningState(snapWarning(storedWarning));
    setCreditsState(storedCredits);
    setLocaleState(storedLocale);
    setUserIdState(storedUserId);
    setBudgetInput(String(storedBudget));
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [loadSettings]),
  );

  async function handleBudgetWarningDraftChange(value) {
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
    const selected = await getHistorySelectedMonth();
    const year = selected?.year ?? now.getFullYear();
    const month = selected?.month ?? now.getMonth();
    const monthExpenses = getMonthExpenses(expenses, year, month);

    await Share.share({
      message: buildMonthlyShareReport(monthExpenses, year, month, t),
    });
  }

  async function handleCreateBackup() {
    if (backupBusy) return;
    setBackupBusy(true);
    try {
      if (!FileSystem.cacheDirectory) {
        throw new Error(t('settings.alerts.cacheUnavailable'));
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
          t('settings.alerts.backupCreatedTitle'),
          t('settings.alerts.backupCreatedNoShare', { uri }),
        );
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: 'application/json',
        dialogTitle: t('settings.alerts.shareBackupTitle'),
        UTI: 'public.json',
      });
    } catch (error) {
      Alert.alert(t('common.error'), formatError(error, t));
    } finally {
      setBackupBusy(false);
    }
  }

  async function handleRestoreBackup() {
    if (backupBusy) return;

    Alert.alert(
      t('settings.alerts.restoreConfirmTitle'),
      t('settings.alerts.restoreConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.continue'),
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
                Alert.alert(t('common.error'), t('settings.alerts.restoreInvalidJson'));
                return;
              }

              const [storedLocale, storedTheme] = await Promise.all([getLocale(), getTheme()]);
              await setLocale(storedLocale);
              await setTheme(resolveImportThemeId(storedTheme));
              await loadSettings();
              setShowBackup(false);
              Alert.alert(t('common.success'), t('settings.alerts.restoreSuccess'));
            } catch (error) {
              Alert.alert(t('common.error'), formatError(error, t));
            } finally {
              setBackupBusy(false);
            }
          },
        },
      ],
    );
  }

  async function handleFaqAction(action) {
    if (action === 'onboarding') {
      setShowFaq(false);
      router.replace('/onboarding?replay=1');
      return;
    }

    setShowFaq(false);
    if (action === 'pricing') {
      setShowPricing(true);
    }
  }

  async function handleCopyUserId() {
    if (!userId) return;
    Clipboard.setString(userId);
    Alert.alert(t('settings.alerts.userIdCopied'));
  }

  function handleDeleteAll() {
    Alert.alert(
      t('settings.alerts.deleteAllTitle'),
      t('settings.alerts.deleteAllMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            await clearAllData();
            await loadSettings();
            Alert.alert(
              t('settings.alerts.deleteAllSuccessTitle'),
              t('settings.alerts.deleteAllSuccessMessage'),
            );
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

        <Text style={styles.sectionLabel}>{t('settings.sections.subscription')}</Text>
        <View style={styles.card}>
          <SettingsRow
            emoji="⚡"
            title={t('settings.subscriptionCreditsTitle')}
            onPress={() => setShowPricing(true)}
            last
            colors={colors}
            styles={styles}
          />
        </View>

        <Text style={styles.sectionLabel}>{t('settings.sections.budgetReports')}</Text>
        <View style={styles.card}>
          <SettingsRow
            emoji="🎯"
            title={t('settings.rows.monthlyBudgetTitle')}
            subtitle={t('settings.rows.monthlyBudgetSubtitle')}
            onPress={openBudgetModal}
            colors={colors}
            styles={styles}
          />
          <SettingsRow
            emoji="📤"
            title={t('settings.rows.shareReportTitle')}
            subtitle={t('settings.rows.shareReportSubtitle')}
            onPress={handleShareReport}
            colors={colors}
            styles={styles}
          />
          <SettingsRow
            emoji="💾"
            title="Backup & Restore"
            subtitle={t('settings.rows.backupRestoreSubtitle')}
            onPress={() => setShowBackup(true)}
            last
            colors={colors}
            styles={styles}
          />
        </View>

        <Text style={styles.sectionLabel}>{t('settings.sections.appearance')}</Text>
        <View style={styles.card}>
          <SettingsRow
            emoji="🌍"
            title={t('settings.rows.languageTitle')}
            subtitle={getLocaleLabel(locale, t)}
            onPress={() => setShowLanguage(true)}
            colors={colors}
            styles={styles}
          />
          <SettingsRow
            emoji="🎨"
            title={t('settings.rows.colorSchemeTitle')}
            subtitle={t(`themes.${themeId}`) ?? 'Theme'}
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

        <Text style={styles.sectionLabel}>{t('settings.sections.about')}</Text>
        <View style={styles.card}>
          <SettingsRow
            emoji="📱"
            title={t('settings.rows.aboutAppTitle')}
            subtitle={t('settings.rows.aboutAppSubtitle')}
            onPress={() => setShowAbout(true)}
            colors={colors}
            styles={styles}
          />
          <SettingsRow
            emoji="❓"
            title={t('settings.rows.faqTitle')}
            subtitle={t('settings.rows.faqSubtitle')}
            onPress={() => setShowFaq(true)}
            colors={colors}
            styles={styles}
          />
          <SettingsRow
            emoji="💬"
            title={t('settings.rows.supportTitle')}
            subtitle={t('settings.rows.supportSubtitle')}
            onPress={() => setShowSupport(true)}
            colors={colors}
            styles={styles}
          />
          <SettingsRow
            emoji="🛡️"
            title={t('settings.rows.legalTitle')}
            subtitle={t('settings.rows.legalSubtitle')}
            onPress={() => setShowLegal(true)}
            last
            colors={colors}
            styles={styles}
          />
        </View>

        <Text style={[styles.sectionLabel, styles.sectionLabelDanger]}>
          {t('settings.sections.dangerZone')}
        </Text>
        <View style={styles.card}>
          <Pressable
            onPress={handleDeleteAll}
            style={({ pressed }) => [styles.dangerButton, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.dangerButtonText}>{t('settings.deleteAllData')}</Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerBrand}>SNAPOMAT</Text>
          <Text style={styles.footerVersion}>{t('settings.versionMvp')}</Text>
        </View>
      </ScrollView>

      <CreditsPricingSheet
        visible={showPricing}
        onClose={() => setShowPricing(false)}
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

      <AboutAppModal
        visible={showAbout}
        onClose={() => setShowAbout(false)}
        colors={colors}
        styles={styles}
      />

      <SupportFeedbackModal
        visible={showSupport}
        onClose={() => setShowSupport(false)}
        userId={userId}
        onCopyUserId={handleCopyUserId}
        colors={colors}
        styles={styles}
      />

      <LegalModal
        visible={showLegal}
        onClose={() => setShowLegal(false)}
        colors={colors}
        styles={styles}
      />

      <FaqModal
        visible={showFaq}
        onClose={() => setShowFaq(false)}
        onAction={handleFaqAction}
        colors={colors}
        styles={styles}
      />

      <LanguageModal
        visible={showLanguage}
        locale={locale}
        onSelect={handleLanguageSelect}
        onClose={() => setShowLanguage(false)}
        colors={colors}
        styles={styles}
      />

      <BudgetModal
        visible={showBudget}
        budgetInput={budgetInput}
        setBudgetInput={setBudgetInput}
        warningValue={budgetWarningDraft}
        onWarningChange={handleBudgetWarningDraftChange}
        onSave={handleSaveBudget}
        onClose={() => setShowBudget(false)}
        colors={colors}
        styles={styles}
        themeId={themeId}
      />
    </>
  );
}
