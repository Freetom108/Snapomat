import { useMemo, useRef, useState, useEffect } from 'react';
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
import {
  useFonts,
  DMSans_400Regular,
  DMSans_700Bold,
  DMSans_800ExtraBold,
  DMSans_900Black,
} from '@expo-google-fonts/dm-sans';
import { CATEGORY_LIST, CATEGORIES, getCategory } from '../../constants/categories';
import { useTheme } from '../../hooks/useTheme';
import { analyzeImage } from '../../services/apiGatekeeper';
import { saveExpense } from '../../store/storage';

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

async function analyzeWithBestOrientation(uri, width, height, scanType) {
  if (width <= height) {
    const base64 = await imageToBase64(uri);
    const result = await analyzeImage(base64, scanType);
    return { base64, result };
  }

  const [base6490, base64270] = await Promise.all([
    imageToBase64(uri, [{ rotate: 90 }]),
    imageToBase64(uri, [{ rotate: 270 }]),
  ]);

  const [result90, result270] = await Promise.all([
    analyzeImage(base6490, scanType),
    analyzeImage(base64270, scanType),
  ]);

  const count90 = result90?.length ?? 0;
  const count270 = result270?.length ?? 0;

  if (count270 > count90) {
    return { base64: base64270, result: result270 };
  }

  return { base64: base6490, result: result90 };
}

const EMPTY_MANUAL = {
  merchant: '',
  amount: '',
  date: new Date().toLocaleDateString('de-DE'),
  categoryId: 'food',
};

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
  };
}

function ScreenHeader({ styles }) {
  return (
    <View style={styles.header}>
      <Text style={styles.brand}>SNAPOMAT</Text>
      <Text style={styles.screenTitle}>Import</Text>
    </View>
  );
}

function SelectionStep({ colors, styles, onReceipt, onStatement, onManual }) {
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
          <Text style={styles.optionTitle}>Kassenzettel</Text>
          <Text style={styles.optionSubtitle}>Foto aufnehmen</Text>
        </View>
      </Pressable>

      <Pressable
        onPress={onStatement}
        style={({ pressed }) => [styles.optionButton, pressed && styles.pressed]}
      >
        <View
          style={[
            styles.iconBox,
            { backgroundColor: withAlpha(CATEGORIES.mobility.color, 0.12) },
          ]}
        >
          <Text style={styles.iconEmoji}>🏦</Text>
        </View>
        <View style={styles.optionText}>
          <Text style={styles.optionTitle}>Kontoauszug</Text>
          <Text style={styles.optionSubtitle}>Foto aufnehmen</Text>
        </View>
      </Pressable>

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>oder</Text>
        <View style={styles.dividerLine} />
      </View>

      <Pressable
        onPress={onManual}
        style={({ pressed }) => [
          styles.manualButton,
          { backgroundColor: colors.accentFaint, borderColor: colors.accentDim },
          pressed && styles.pressed,
        ]}
      >
        <Text style={[styles.manualButtonText, { color: colors.accent }]}>Manuell eingeben</Text>
      </Pressable>
    </View>
  );
}

function CameraModal({ visible, colors, styles, onCancel, onCapture }) {
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
            <Text style={styles.permissionText}>Kamerazugriff erforderlich</Text>
            <Pressable onPress={requestPermission} style={styles.permissionButton}>
              <Text style={styles.permissionButtonText}>Berechtigung erteilen</Text>
            </Pressable>
            <Pressable onPress={onCancel} style={styles.cameraCancel}>
              <Text style={styles.cameraCancelText}>Abbrechen</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <CameraView ref={cameraRef} style={styles.camera} facing="back" />
            <Pressable onPress={onCancel} style={styles.cameraCancel}>
              <Text style={styles.cameraCancelText}>Abbrechen</Text>
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

function ReviewField({ label, value, onChangeText, colors, styles, keyboardType = 'default' }) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={styles.fieldValue}
        keyboardType={keyboardType}
        placeholderTextColor={colors.muted}
      />
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
          <Text style={styles.scanTitle}>Analyse läuft...</Text>
          <Text style={styles.scanSubtitle}>Beleg wird ausgewertet</Text>
        </View>
      </View>
    </Modal>
  );
}

function MultiReviewStep({ colors, styles, items, onSaveAll, onRemoveItem, onCancel, saving }) {
  return (
    <View style={styles.reviewContent}>
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
          {items.length} Einträge erkannt – bitte prüfen
        </Text>
      </View>

      <Text style={styles.sectionLabel}>ALLE EINTRÄGE</Text>

      {items.map((item, index) => {
        const category = getCategory(item.categoryId);
        return (
          <View
            key={`${item.merchant}-${item.date}-${index}`}
            style={[styles.multiCard, index < items.length - 1 && styles.multiCardSpacing]}
          >
            <View style={styles.multiCardInner}>
              <View style={styles.multiCardBody}>
                <View style={styles.multiRow}>
                  <Text style={styles.multiMerchant}>{item.merchant || 'Unbekannt'}</Text>
                  <Text style={styles.multiAmount}>{item.amount} €</Text>
                </View>
                <View style={styles.multiRow}>
                  <Text style={styles.multiMeta}>
                    {category ? `${category.emoji} ${category.label}` : item.categoryId}
                  </Text>
                  <Text style={styles.multiMeta}>{item.date}</Text>
                </View>
              </View>
              <Pressable
                onPress={() => onRemoveItem(index)}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.multiRemoveButton,
                  pressed && { opacity: 0.6 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Eintrag entfernen"
              >
                <Text style={[styles.multiRemoveText, { color: colors.muted }]}>×</Text>
              </Pressable>
            </View>
          </View>
        );
      })}

      <Pressable
        onPress={onSaveAll}
        disabled={saving || items.length === 0}
        style={({ pressed }) => [
          styles.saveButton,
          {
            backgroundColor: colors.accent,
            opacity: saving || items.length === 0 ? 0.5 : 1,
          },
          pressed && !saving && items.length > 0 && styles.pressed,
        ]}
      >
        <Text style={styles.saveButtonText}>{saving ? 'Speichern…' : 'Alle speichern'}</Text>
      </Pressable>

      <Pressable onPress={onCancel} style={styles.cancelButton}>
        <Text style={styles.cancelButtonText}>Abbrechen</Text>
      </Pressable>
    </View>
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
}) {
  function handleSavePress() {
    onSave({
      ...form,
      categoryId: selectedCategory,
    });
  }

  const activeCategory = getCategory(selectedCategory);

  return (
    <View style={styles.reviewContent}>
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
          ✅ Erkannt – bitte überprüfen
        </Text>
      </View>

      <Text style={styles.sectionLabel}>DATEN PRÜFEN</Text>

      <View style={styles.fieldsCard}>
        <ReviewField
          label="Händler"
          value={form.merchant}
          onChangeText={(merchant) => setForm((prev) => ({ ...prev, merchant }))}
          colors={colors}
          styles={styles}
        />
        <View style={styles.fieldDivider} />
        <ReviewField
          label="Betrag"
          value={form.amount}
          onChangeText={(amount) => setForm((prev) => ({ ...prev, amount }))}
          colors={colors}
          styles={styles}
          keyboardType="decimal-pad"
        />
        <View style={styles.fieldDivider} />
        <ReviewField
          label="Datum"
          value={form.date}
          onChangeText={(date) => setForm((prev) => ({ ...prev, date }))}
          colors={colors}
          styles={styles}
        />
      </View>

      <Text style={styles.sectionLabel}>KATEGORIE</Text>

      {activeCategory ? (
        <Text style={[styles.selectedCategoryHint, { color: colors.muted }]}>
          {activeCategory.emoji} {activeCategory.label}
        </Text>
      ) : null}

      <View style={styles.chipRow}>
        {CATEGORY_LIST.map((cat) => (
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
        <Text style={styles.saveButtonText}>{saving ? 'Speichern…' : 'Speichern'}</Text>
      </Pressable>

      <Pressable onPress={onCancel} style={styles.cancelButton}>
        <Text style={styles.cancelButtonText}>Abbrechen</Text>
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
    fieldValue: {
      flex: 1,
      fontFamily: 'DMSans_700Bold',
      fontSize: 17,
      color: colors.text,
      textAlign: 'right',
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
    multiCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
    },
    multiCardSpacing: {
      marginBottom: 12,
    },
    multiCardInner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },
    multiCardBody: {
      flex: 1,
    },
    multiRemoveButton: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: -2,
    },
    multiRemoveText: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 22,
      lineHeight: 24,
    },
    multiRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    multiMerchant: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 15,
      color: colors.text,
      flex: 1,
    },
    multiAmount: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 16,
      color: colors.text,
    },
    multiMeta: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 12,
      color: colors.muted,
    },
  });
}

export default function AddScreen() {
  const router = useRouter();
  const { colors, ready: themeReady } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [step, setStep] = useState('select');
  const [showCamera, setShowCamera] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [importType, setImportType] = useState(null);
  const [photoBase64, setPhotoBase64] = useState(null);
  const [form, setForm] = useState(EMPTY_MANUAL);
  const [selectedCategory, setSelectedCategory] = useState(EMPTY_MANUAL.categoryId);
  const [multiItems, setMultiItems] = useState([]);
  const [saving, setSaving] = useState(false);

  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_700Bold,
    DMSans_800ExtraBold,
    DMSans_900Black,
  });

  function openCamera(type) {
    setImportType(type);
    setShowCamera(true);
  }

  async function handleCapture(photo) {
    setShowCamera(false);
    setIsScanning(true);

    try {
      const scanType = importType ?? 'statement';
      const { base64, result } = await analyzeWithBestOrientation(
        photo.uri,
        photo.width,
        photo.height,
        scanType,
      );

      if (!base64 || !result || result.length === 0) {
        Alert.alert('Analyse fehlgeschlagen – bitte erneut versuchen');
        return;
      }

      setPhotoBase64(base64);

      if (result.length === 1) {
        const nextForm = apiItemToForm(result[0]);
        setForm(nextForm);
        setSelectedCategory(nextForm.categoryId);
        setStep('review');
        return;
      }

      setMultiItems(result.map(apiItemToForm));
      setStep('multi-review');
    } catch {
      Alert.alert('Analyse fehlgeschlagen – bitte erneut versuchen');
      setPhotoBase64(null);
    } finally {
      setIsScanning(false);
    }
  }

  function handleManual() {
    setImportType('manual');
    setPhotoBase64(null);
    setForm({ ...EMPTY_MANUAL });
    setSelectedCategory(EMPTY_MANUAL.categoryId);
    setStep('review');
  }

  function handleBack() {
    setStep('select');
    setPhotoBase64(null);
    setImportType(null);
    setForm({ ...EMPTY_MANUAL });
    setSelectedCategory(EMPTY_MANUAL.categoryId);
    setMultiItems([]);
  }

  function handleRemoveMultiItem(index) {
    setMultiItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSaveAll() {
    if (saving) return;
    setSaving(true);
    try {
      for (const item of multiItems) {
        await saveExpense(formToExpense(item));
      }
      handleBack();
      router.replace('/(tabs)');
    } finally {
      setSaving(false);
    }
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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ScreenHeader styles={styles} />

        {step === 'select' ? (
          <SelectionStep
            colors={colors}
            styles={styles}
            onReceipt={() => openCamera('receipt')}
            onStatement={() => openCamera('statement')}
            onManual={handleManual}
          />
        ) : step === 'multi-review' ? (
          <MultiReviewStep
            colors={colors}
            styles={styles}
            items={multiItems}
            onSaveAll={handleSaveAll}
            onRemoveItem={handleRemoveMultiItem}
            onCancel={handleBack}
            saving={saving}
          />
        ) : (
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
          />
        )}
      </ScrollView>

      <ScanOverlay visible={isScanning} colors={colors} styles={styles} />

      <CameraModal
        visible={showCamera}
        colors={colors}
        styles={styles}
        onCancel={() => setShowCamera(false)}
        onCapture={handleCapture}
      />
    </View>
  );
}
