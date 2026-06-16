import { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
} from 'react-native';
import { getCategory, getCategoryList } from '../constants/categories';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import { deleteExpense, updateExpense } from '../store/storage';
import { parseExpenseDate } from '../utils/expenseHelpers';

function withAlpha(hex, alpha) {
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
}

function formatDisplayDate(dateStr) {
  const date = parseExpenseDate(dateStr);
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatAmountInput(amount) {
  const num = Number(amount);
  if (Number.isNaN(num)) return '';
  return num.toFixed(2).replace('.', ',');
}

function parseAmountInput(value) {
  return parseFloat(String(value).replace(',', '.')) || 0;
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

function CategoryChip({ category, selected, colors, onPress }) {
  const isSelected = selected === category.id;

  return (
    <Pressable
      onPress={() => onPress(category.id)}
      style={[
        styles.chip,
        {
          backgroundColor: isSelected ? withAlpha(category.color, 0.22) : colors.background,
          borderColor: isSelected ? category.color : colors.border,
        },
      ]}
    >
      <Text style={styles.chipEmoji}>{category.emoji}</Text>
      <Text style={[styles.chipLabel, { color: isSelected ? category.color : colors.muted }]}>
        {category.label}
      </Text>
    </Pressable>
  );
}

export default function ExpenseDetailSheet({
  visible,
  expense,
  onClose,
  onChanged,
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const categories = getCategoryList();
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [categoryId, setCategoryId] = useState('food');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (expense) {
      setAmount(formatAmountInput(expense.amount));
      setDate(formatDisplayDate(expense.date));
      setCategoryId(expense.category ?? 'food');
    }
  }, [expense]);

  if (!expense) return null;

  const category = getCategory(categoryId);

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    await updateExpense(expense.id, {
      amount: parseAmountInput(amount),
      date: formDateToIso(date),
      category: categoryId,
    });
    setSaving(false);
    await onChanged?.();
    onClose();
  }

  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);
    await deleteExpense(expense.id);
    setDeleting(false);
    await onChanged?.();
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.card }]} onPress={() => {}}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View
              style={[
                styles.iconBox,
                { backgroundColor: withAlpha(category?.color ?? colors.accent, 0.18) },
              ]}
            >
              <Text style={styles.iconEmoji}>{category?.emoji ?? '💰'}</Text>
            </View>
            <Text style={[styles.merchant, { color: colors.text }]}>
              {expense.merchant || t('expenseDetail.defaultMerchant')}
            </Text>
          </View>

          <View style={[styles.fieldsCard, { backgroundColor: colors.background }]}>
            <View style={styles.fieldRow}>
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>{t('expenseDetail.amount')}</Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0,00"
                placeholderTextColor={colors.muted}
                style={[styles.fieldInput, styles.amountInput, { color: colors.accent }]}
              />
            </View>
            <View style={[styles.fieldDivider, { backgroundColor: colors.border }]} />
            <View style={styles.fieldRow}>
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>{t('expenseDetail.date')}</Text>
              <TextInput
                value={date}
                onChangeText={setDate}
                placeholder="TT.MM.JJJJ"
                placeholderTextColor={colors.muted}
                keyboardType="numbers-and-punctuation"
                style={[styles.fieldInput, { color: colors.text }]}
              />
            </View>
            <View style={[styles.fieldDivider, { backgroundColor: colors.border }]} />
            <View style={styles.fieldRow}>
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>{t('expenseDetail.category')}</Text>
              <Text style={[styles.fieldValue, { color: colors.text }]}>
                {category ? `${category.emoji} ${category.label}` : categoryId}
              </Text>
            </View>
          </View>

          <Text style={[styles.sectionLabel, { color: colors.muted }]}>{t('expenseDetail.changeCategory')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            <View style={styles.chipRow}>
              {categories.map((cat) => (
                <CategoryChip
                  key={cat.id}
                  category={cat}
                  selected={categoryId}
                  colors={colors}
                  onPress={setCategoryId}
                />
              ))}
            </View>
          </ScrollView>

          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={({ pressed }) => [
              styles.saveButton,
              { backgroundColor: colors.accent, opacity: saving ? 0.5 : pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={styles.saveButtonText}>
              {saving ? t('common.saving') : t('expenseDetail.save')}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleDelete}
            disabled={deleting}
            style={({ pressed }) => [
              styles.deleteButton,
              { borderColor: colors.red, opacity: deleting || pressed ? 0.7 : 1 },
            ]}
          >
            <Text style={[styles.deleteButtonText, { color: colors.red }]}>{t('expenseDetail.delete')}</Text>
          </Pressable>

          <Pressable onPress={onClose} style={styles.closeButton}>
            <Text style={[styles.closeButtonText, { color: colors.muted }]}>{t('expenseDetail.close')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#666666',
    alignSelf: 'center',
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
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
  merchant: {
    flex: 1,
    fontFamily: 'DMSans_700Bold',
    fontSize: 20,
  },
  fieldsCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  fieldLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
  },
  fieldInput: {
    flex: 1,
    fontFamily: 'DMSans_700Bold',
    fontSize: 17,
    textAlign: 'right',
    paddingVertical: 0,
  },
  amountInput: {
    fontFamily: 'DMSans_900Black',
    fontSize: 22,
  },
  fieldValue: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 17,
    flex: 1,
    textAlign: 'right',
  },
  fieldDivider: {
    height: 1,
  },
  sectionLabel: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  chipScroll: {
    marginBottom: 20,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
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
  deleteButton: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 17,
    alignItems: 'center',
    marginBottom: 12,
  },
  deleteButtonText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 17,
  },
  closeButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  closeButtonText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
  },
});
