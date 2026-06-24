import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Modal,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Alert,
  Animated,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import {
  useFonts,
  DMSans_400Regular,
  DMSans_700Bold,
  DMSans_800ExtraBold,
  DMSans_900Black,
} from '@expo-google-fonts/dm-sans';
import { CATEGORY_LIST, CATEGORIES, getCategory, getCategoryList } from '../../constants/categories';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { analyzeImage } from '../../services/apiGatekeeper';
import { getExpenses, saveExpense, findMerchantMatch, saveMerchantToLibrary, getCredits, deductCredit, hasAccess } from '../../store/storage';
import CreditsPricingSheet from '../../components/CreditsPricingSheet';

function withAlpha(hex, alpha) {
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
}

const MANIPULATE_JPEG = { base64: true, format: ImageManipulator.SaveFormat.JPEG };

async function imageToBase64(uri, actions = []) {
  const result = await ImageManipulator.manipulateAsync(uri, actions, MANIPULATE_JPEG);
  return result.base64;
}

async function analyzeReceipt(uri) {
  const base64 = await imageToBase64(uri);
  const result = await analyzeImage(base64);
  return { base64, result };
}

const EMPTY_MANUAL = {
  merchant: '',
  amount: '',
  date: new Date().toLocaleDateString('de-DE'),
  categoryId: 'food',
  merchantConfidence: 0.9,
  dateConfidence: 0.9,
  amountConfidence: 0.9,
  recognizedMerchant: '',
  merchantLibraryConfidence: null,
};

const UNCERTAIN_GOLD = '#E8B84B';

function isUncertainConfidence(confidence) {
  return Number(confidence) < 0.7;
}

async function applyMerchantLibraryToForm(form, recognizedMerchant) {
  const { match, confidence } = await findMerchantMatch(recognizedMerchant);

  const updated = {
    ...form,
    recognizedMerchant,
    merchantLibraryConfidence: confidence,
  };

  if (confidence === 'high' && match) {
    updated.merchant = match;
  } else if (confidence === 'medium' && match) {
    updated.merchant = match;
  }

  return updated;
}

function shouldShowMerchantWarning(form) {
  if (form.merchantLibraryConfidence === 'high') {
    return false;
  }

  if (form.merchantLibraryConfidence === 'medium') {
    return true;
  }

  return isUncertainConfidence(form.merchantConfidence);
}

function formatAmount(amount) {
  const num = Number(amount);
  if (Number.isNaN(num)) return '';
  return num.toFixed(2).replace('.', ',');
}

function formatDate(isoDate) {
  if (!isoDate) return new Date().toLocaleDateString('de-DE');
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return String(isoDate);
  return parsed.toLocaleDateString('de-DE');
}

function normalizeCategoryId(category) {
  if (!category) return 'food';
  const value = String(category).trim();
  if (CATEGORIES[value]) return value;
  const lower = value.toLowerCase();
  if (CATEGORIES[lower]) return lower;
  if (lower.startsWith('going-out') || lower === 'going_out') return 'going-out';
  return 'food';
}

function formDateToIso(dateStr) {
  if (!dateStr) return new Date().toISOString().slice(0, 10);
  if (dateStr.includes('.')) {
    const [day, month, year] = dateStr.split('.');
    if (day && month && year) {
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }
  return dateStr;
}

function formToExpense(form) {
  const categoryId = normalizeCategoryId(form.categoryId ?? form.category);
  return {
    merchant: form.merchant,
    amount: parseFloat(String(form.amount).replace(',', '.')) || 0,
    date: formDateToIso(form.date),
    category: categoryId,
  };
}

function apiItemToForm(item) {
  return {
    merchant: item.merchant ?? '',
    amount: formatAmount(item.amount),
    date: formatDate(item.date),
    categoryId: normalizeCategoryId(item.category ?? item.categoryId),
    merchantConfidence: Number(item.merchantConfidence) ?? 0.9,
    dateConfidence: Number(item.dateConfidence) ?? 0.9,
    amountConfidence: Number(item.amountConfidence) ?? 0.9,
  };
}

function normalizeStoredAmount(amount) {
  const num = Number(amount);
  if (Number.isNaN(num)) return 0;
  return Math.round(num * 100) / 100;
}

function toIsoDate(dateStr) {
  if (!dateStr) return '';
  if (dateStr.includes('.')) return formDateToIso(dateStr);
  return String(dateStr).slice(0, 10);
}

function isDuplicateEntry(expenses, amount, date) {
  const targetAmount = normalizeStoredAmount(
    typeof amount === 'string' ? parseFloat(amount.replace(',', '.')) : amount,
  );
  const targetDate = toIsoDate(date);

  return expenses.some((expense) => (
    normalizeStoredAmount(expense.amount) === targetAmount
    && toIsoDate(expense.date) === targetDate
  ));
}

function confirmDuplicateAdd(t) {
  return new Promise((resolve) => {
    Alert.alert(
      t('import.duplicateTitle'),
      t('import.duplicateMessage'),
      [
        {
          text: t('import.duplicateCancel'),
          style: 'cancel',
          onPress: () => resolve(false),
        },
        {
          text: t('import.duplicateConfirm'),
          onPress: () => resolve(true),
        },
      ],
      { cancelable: false },
    );
  });
}

async function proceedSingleReviewIfAllowed(formItem, expenses, t) {
  const amount = parseFloat(String(formItem.amount).replace(',', '.')) || 0;
  if (!isDuplicateEntry(expenses, amount, formItem.date)) {
    return true;
  }
  return confirmDuplicateAdd(t);
}

function ScreenHeader({ styles, credits = 0 }) {
  const { t } = useTranslation();
  return (
    <View style={styles.header}>
      <Text style={styles.brand}>SNAPOMAT</Text>
      <View style={styles.headerTitleRow}>
        <Text style={styles.screenTitle}>Import</Text>
        <Text style={styles.headerCredits}>{t(credits === 1 ? 'import.creditsShortSingular' : 'import.creditsShort', { count: credits })}</Text>
      </View>
    </View>
  );
}

function SelectionStep({ colors, styles, onReceipt, onManual }) {
  const { t } = useTranslation();

  return (
    <View style={styles.stepContent}>
      <Pressable
        onPress={onReceipt}
        style={({ pressed }) => [styles.optionButton, pressed && styles.pressed]}
      >
        <View style={[styles.iconBox, { backgroundColor: withAlpha(colors.green, 0.12) }]}>
          <Text style={styles.iconEmoji}>🧾</Text>
        </View>
        <View style={styles.optionText}>
          <Text style={styles.optionTitle}>{t('import.receiptTitle')}</Text>
          <Text style={styles.optionSubtitle}>{t('import.receiptSubtitle')}</Text>
          <Text style={styles.optionCreditNote}>{t('import.receiptCreditCost')}</Text>
        </View>
      </Pressable>

      <Text style={styles.receiptHint}>{t('import.receiptHint')}</Text>

      <Pressable
        onPress={onManual}
        style={({ pressed }) => [
          styles.manualButton,
          { backgroundColor: colors.accentFaint, borderColor: colors.accentDim },
          pressed && styles.pressed,
        ]}
      >
        <Text style={[styles.manualButtonText, { color: colors.accent }]}>{t('import.manualEntry')}</Text>
      </Pressable>

      <Text style={[styles.manualHint, { color: colors.muted }]}>{t('import.manualHint')}</Text>
    </View>
  );
}

function CameraModal({ visible, colors, styles, onCancel, onCapture }) {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);

  async function handleCapture() {
    const photo = await cameraRef.current?.takePictureAsync({
      quality: 0.8,
    });
    if (photo?.uri) {
      onCapture(photo);
    }
  }

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.cameraContainer}>
        {!permission?.granted ? (
          <View style={styles.cameraFallback}>
            <Text style={styles.permissionText}>{t('import.cameraPermission')}</Text>
            <Pressable onPress={requestPermission} style={styles.permissionButton}>
              <Text style={styles.permissionButtonText}>{t('import.cameraGrant')}</Text>
            </Pressable>
            <Pressable onPress={onCancel} style={styles.cameraCancel}>
              <Text style={styles.cameraCancelText}>{t('common.cancel')}</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <CameraView ref={cameraRef} style={styles.camera} facing="back" />
            <Pressable onPress={onCancel} style={styles.cameraCancel}>
              <Text style={styles.cameraCancelText}>{t('common.cancel')}</Text>
            </Pressable>
            <View style={styles.shutterRow}>
              <Pressable onPress={handleCapture} style={styles.shutterOuter}>
                <View style={styles.shutterInner} />
              </Pressable>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

function ReviewField({
  label,
  value,
  onChangeText,
  colors,
  styles,
  keyboardType = 'default',
  uncertain = false,
  placeholder,
  smallWarning = false,
}) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldValueWrap}>
        {uncertain ? (
          <Text
            style={[
              styles.fieldWarningPrefix,
              smallWarning && styles.fieldWarningPrefixSmall,
            ]}
          >
            ⚠️{' '}
          </Text>
        ) : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          style={[
            styles.fieldValue,
            uncertain && styles.fieldValueUncertain,
          ]}
          keyboardType={keyboardType}
          placeholderTextColor={uncertain ? UNCERTAIN_GOLD : colors.muted}
        />
      </View>
    </View>
  );
}

function ReviewCategoryChip({ category, selectedCategory, colors, styles, onSelectCategory }) {
  const isSelected = selectedCategory === category.id;

  return (
    <Pressable
      onPress={() => onSelectCategory(category.id)}
      style={[
        styles.chip,
        {
          backgroundColor: isSelected ? withAlpha(category.color, 0.22) : colors.card,
          borderColor: isSelected ? category.color : colors.border,
        },
      ]}
    >
      <Text style={styles.chipEmoji}>{category.emoji}</Text>
      <Text
        style={[
          styles.chipLabel,
          { color: isSelected ? category.color : colors.muted },
        ]}
      >
        {category.label}
      </Text>
    </Pressable>
  );
}

function ScanOverlay({ visible, colors, styles }) {
  const { t } = useTranslation();
  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return undefined;

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(scanAnim, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [visible, scanAnim]);

  const translateY = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 220],
  });

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.scanOverlay}>
        <View style={styles.scanBox}>
          <View style={styles.scanFrame}>
            <Animated.View
              style={[styles.scanLine, { transform: [{ translateY }] }]}
            />
          </View>
          <ActivityIndicator color={colors.accent} size="large" style={styles.scanSpinner} />
          <Text style={styles.scanTitle}>{t('import.scanTitle')}</Text>
          <Text style={styles.scanSubtitle}>{t('import.scanSubtitle')}</Text>
        </View>
      </View>
    </Modal>
  );
}

function ReviewStep({
  colors,
  styles,
  form,
  setForm,
  selectedCategory,
  onSelectCategory,
  onSave,
  onCancel,
  saving,
  isScanned,
}) {
  const { t } = useTranslation();

  function handleSavePress() {
    onSave({
      ...form,
      categoryId: selectedCategory,
    });
  }

  return (
    <View style={styles.reviewContent}>
      {isScanned ? (
        <View
          style={[
            styles.successBadge,
            {
              backgroundColor: withAlpha(colors.green, 0.1),
              borderColor: withAlpha(colors.green, 0.2),
            },
          ]}
        >
          <Text style={[styles.successBadgeText, { color: colors.green }]}>
            {t('import.reviewDetected')}
          </Text>
        </View>
      ) : null}

      <Text style={styles.sectionLabel}>{t('import.reviewSection')}</Text>

      <View style={styles.fieldsCard}>
        <ReviewField
          label={t('import.fieldMerchant')}
          value={form.merchant}
          onChangeText={(merchant) => setForm((prev) => ({ ...prev, merchant }))}
          colors={colors}
          styles={styles}
          uncertain={shouldShowMerchantWarning(form)}
          smallWarning
        />
        <View style={styles.fieldDivider} />
        <ReviewField
          label={t('import.fieldAmount')}
          value={form.amount}
          onChangeText={(amount) => setForm((prev) => ({ ...prev, amount }))}
          colors={colors}
          styles={styles}
          keyboardType="decimal-pad"
          uncertain={isUncertainConfidence(form.amountConfidence)}
        />
        <View style={styles.fieldDivider} />
        <ReviewField
          label={t('import.fieldDate')}
          value={form.date}
          onChangeText={(date) => setForm((prev) => ({ ...prev, date }))}
          colors={colors}
          styles={styles}
          uncertain={isUncertainConfidence(form.dateConfidence)}
        />
      </View>

      <Text style={styles.sectionLabel}>{t('import.sectionCategory')}</Text>

      <View style={styles.chipRow}>
        {getCategoryList().map((cat) => (
          <ReviewCategoryChip
            key={cat.id}
            category={cat}
            selectedCategory={selectedCategory}
            colors={colors}
            styles={styles}
            onSelectCategory={onSelectCategory}
          />
        ))}
      </View>

      <Pressable
        onPress={handleSavePress}
        disabled={saving}
        style={({ pressed }) => [
          styles.saveButton,
          { backgroundColor: colors.accent, opacity: saving ? 0.5 : 1 },
          pressed && !saving && styles.pressed,
        ]}
      >
        <Text style={styles.saveButtonText}>{saving ? t('common.saving') : t('common.save')}</Text>
      </Pressable>

      <Pressable onPress={onCancel} style={styles.cancelButton}>
        <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
      </Pressable>
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    centered: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 50,
      paddingBottom: 32,
    },
    selectLayout: {
      flex: 1,
    },
    selectHeader: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      paddingHorizontal: 20,
      paddingTop: 50,
    },
    headerTitleRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
    },
    headerCredits: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 13,
      color: colors.accent,
      marginBottom: 4,
    },
    selectCentered: {
      flex: 1,
      paddingHorizontal: 20,
      paddingBottom: 32,
      justifyContent: 'center',
    },
    header: {
      marginBottom: 24,
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
    stepContent: {
      gap: 12,
    },
    optionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 20,
      gap: 16,
    },
    iconBox: {
      width: 52,
      height: 52,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconEmoji: {
      fontSize: 24,
    },
    optionText: {
      flex: 1,
      gap: 4,
    },
    optionTitle: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 17,
      color: colors.text,
    },
    optionSubtitle: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 15,
      color: colors.muted,
    },
    optionCreditNote: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 11,
      color: withAlpha(colors.muted, 0.6),
      marginTop: 2,
    },
    receiptHint: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 12,
      color: colors.muted,
      textAlign: 'center',
      marginTop: 8,
      paddingHorizontal: 8,
    },
    dividerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 8,
      gap: 12,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.border,
    },
    dividerText: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 14,
      color: colors.muted,
    },
    manualButton: {
      borderRadius: 16,
      borderWidth: 1,
      padding: 17,
      alignItems: 'center',
    },
    manualButtonText: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 17,
    },
    manualHint: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 12,
      textAlign: 'center',
      paddingTop: 8,
    },
    pressed: {
      opacity: 0.85,
    },
    cameraContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    camera: {
      flex: 1,
    },
    cameraFallback: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      gap: 16,
    },
    permissionText: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 16,
      color: colors.text,
      textAlign: 'center',
    },
    permissionButton: {
      backgroundColor: colors.accent,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 12,
    },
    permissionButtonText: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 15,
      color: colors.background,
    },
    cameraCancel: {
      position: 'absolute',
      top: 56,
      left: 20,
      zIndex: 10,
    },
    cameraCancelText: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 16,
      color: colors.muted,
    },
    shutterRow: {
      position: 'absolute',
      bottom: 48,
      left: 0,
      right: 0,
      alignItems: 'center',
    },
    shutterOuter: {
      width: 70,
      height: 70,
      borderRadius: 35,
      backgroundColor: colors.text,
      alignItems: 'center',
      justifyContent: 'center',
    },
    shutterInner: {
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor: colors.text,
      borderWidth: 3,
      borderColor: colors.background,
    },
    reviewContent: {
      paddingBottom: 32,
    },
    successBadge: {
      borderRadius: 12,
      borderWidth: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      marginBottom: 16,
    },
    successBadgeText: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 14,
      textAlign: 'center',
    },
    sectionLabel: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 11,
      color: colors.muted,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      marginBottom: 12,
    },
    fieldsCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      overflow: 'hidden',
      marginBottom: 16,
    },
    fieldRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 16,
      gap: 12,
    },
    fieldLabel: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 15,
      color: colors.muted,
    },
    fieldValueWrap: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
    },
    fieldWarningPrefix: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 17,
      color: UNCERTAIN_GOLD,
    },
    fieldWarningPrefixSmall: {
      fontSize: 14,
    },
    fieldValue: {
      flex: 1,
      fontFamily: 'DMSans_700Bold',
      fontSize: 17,
      color: colors.text,
      textAlign: 'right',
    },
    fieldValueUncertain: {
      color: UNCERTAIN_GOLD,
    },
    fieldDivider: {
      height: 1,
      backgroundColor: colors.border,
    },
    selectedCategoryHint: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 13,
      marginBottom: 10,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: 24,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      marginRight: 8,
      marginBottom: 8,
    },
    chipEmoji: {
      fontSize: 14,
    },
    chipLabel: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 12,
    },
    saveButton: {
      borderRadius: 16,
      padding: 17,
      alignItems: 'center',
      marginBottom: 12,
    },
    saveButtonText: {
      fontFamily: 'DMSans_900Black',
      fontSize: 17,
      color: '#000000',
    },
    cancelButton: {
      alignItems: 'center',
      paddingVertical: 8,
    },
    cancelButtonText: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 15,
      color: colors.muted,
    },
    scanOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.85)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    scanBox: {
      alignItems: 'center',
      width: '100%',
    },
    scanFrame: {
      width: 260,
      height: 240,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: colors.accent,
      overflow: 'hidden',
      marginBottom: 24,
      backgroundColor: withAlpha(colors.accent, 0.05),
    },
    scanLine: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: 3,
      backgroundColor: colors.accent,
      shadowColor: colors.accent,
      shadowOpacity: 0.8,
      shadowRadius: 8,
    },
    scanSpinner: {
      marginBottom: 16,
    },
    scanTitle: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 18,
      color: colors.text,
      marginBottom: 6,
    },
    scanSubtitle: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 15,
      color: colors.muted,
    },
  });
}

export default function AddScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, ready: themeReady } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [step, setStep] = useState('select');
  const [showCamera, setShowCamera] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [photoBase64, setPhotoBase64] = useState(null);
  const [form, setForm] = useState(EMPTY_MANUAL);
  const [selectedCategory, setSelectedCategory] = useState(EMPTY_MANUAL.categoryId);
  const [saving, setSaving] = useState(false);
  const [credits, setCredits] = useState(0);
  const [showPricing, setShowPricing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getCredits().then((value) => {
        if (active) setCredits(value);
      });
      return () => {
        active = false;
      };
    }, []),
  );

  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_700Bold,
    DMSans_800ExtraBold,
    DMSans_900Black,
  });

  async function openCamera() {
    const access = await hasAccess();
    if (!access) {
      Alert.alert(t('paywall.trialExpiredMessage'));
      setShowPricing(true);
      return;
    }
    const current = await getCredits();
    setCredits(current);
    if (current <= 0) {
      Alert.alert(t('import.noCreditsMessage'));
      setShowPricing(true);
      return;
    }
    setShowCamera(true);
  }

  async function handleCapture(photo) {
    setShowCamera(false);
    setIsScanning(true);

    try {
      const remaining = await deductCredit();
      setCredits(remaining);

      const { base64, result } = await analyzeReceipt(photo.uri);

      if (!base64 || !result || result.length === 0) {
        Alert.alert(t('import.analysisFailed'));
        return;
      }

      setPhotoBase64(base64);

      const expenses = await getExpenses();
      const nextForm = apiItemToForm(result[0]);
      const withLibrary = await applyMerchantLibraryToForm(nextForm, nextForm.merchant);
      const allowed = await proceedSingleReviewIfAllowed(withLibrary, expenses, t);
      if (!allowed) {
        setPhotoBase64(null);
        return;
      }
      setForm(withLibrary);
      setSelectedCategory(withLibrary.categoryId);
      setStep('review');
    } catch {
      Alert.alert(t('import.analysisFailed'));
      setPhotoBase64(null);
    } finally {
      setIsScanning(false);
    }
  }

  async function handleManual() {
    const access = await hasAccess();
    if (!access) {
      Alert.alert(t('paywall.trialExpiredMessage'));
      setShowPricing(true);
      return;
    }
    setPhotoBase64(null);
    setForm({ ...EMPTY_MANUAL });
    setSelectedCategory(EMPTY_MANUAL.categoryId);
    setStep('review');
  }

  function handleBack() {
    setStep('select');
    setPhotoBase64(null);
    setForm({ ...EMPTY_MANUAL });
    setSelectedCategory(EMPTY_MANUAL.categoryId);
  }

  function handleSelectCategory(categoryId) {
    const normalized = normalizeCategoryId(categoryId);
    setSelectedCategory(normalized);
    setForm((prev) => ({ ...prev, categoryId: normalized }));
  }

  async function handleSave(formData) {
    if (saving) return;
    setSaving(true);
    try {
      const payload = {
        ...formData,
        categoryId: normalizeCategoryId(formData.categoryId ?? selectedCategory),
      };
      if (formData.recognizedMerchant) {
        await saveMerchantToLibrary(formData.recognizedMerchant, payload.merchant);
      }
      await saveExpense(formToExpense(payload));
      handleBack();
      router.replace('/(tabs)');
    } finally {
      setSaving(false);
    }
  }

  if (!fontsLoaded || !themeReady) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {step === 'select' ? (
        <View style={styles.selectLayout}>
          <View style={styles.selectCentered}>
            <SelectionStep
              colors={colors}
              styles={styles}
              onReceipt={openCamera}
              onManual={handleManual}
            />
          </View>
          <View style={styles.selectHeader}>
            <ScreenHeader styles={styles} credits={credits} />
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ScreenHeader styles={styles} credits={credits} />
          <ReviewStep
            colors={colors}
            styles={styles}
            form={form}
            setForm={setForm}
            selectedCategory={selectedCategory}
            onSelectCategory={handleSelectCategory}
            onSave={handleSave}
            onCancel={handleBack}
            saving={saving}
            isScanned={!!photoBase64}
          />
        </ScrollView>
      )}

      <ScanOverlay visible={isScanning} colors={colors} styles={styles} />

      <CameraModal
        visible={showCamera}
        colors={colors}
        styles={styles}
        onCancel={() => setShowCamera(false)}
        onCapture={handleCapture}
      />

      <CreditsPricingSheet
        visible={showPricing}
        onClose={() => setShowPricing(false)}
      />
    </View>
  );
}
