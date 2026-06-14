import { View, Text, StyleSheet, Pressable } from 'react-native';
import { getCategory } from '../constants/categories';
import { useTranslation } from '../hooks/useTranslation';
import { formatCurrency, formatRelativeDate } from '../utils/expenseHelpers';
import { typography } from '../constants/typography';

export default function ExpenseRow({ expense, theme, onPress }) {
  useTranslation();
  const category = getCategory(expense.categoryId);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <View style={[styles.emoji, { backgroundColor: theme.dim }]}>
        <Text style={styles.emojiText}>{category?.emoji ?? '💰'}</Text>
      </View>
      <View style={styles.info}>
        <Text style={[typography.body, { color: theme.text }]}>
          {expense.merchant || category?.label || 'Ausgabe'}
        </Text>
        <Text style={[typography.label, { color: theme.muted }]}>
          {formatRelativeDate(expense.date)}
        </Text>
      </View>
      <Text style={[typography.title, { color: theme.text }]}>
        {formatCurrency(expense.amount)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  emoji: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  emojiText: {
    fontSize: 18,
  },
  info: {
    flex: 1,
    gap: 2,
  },
});
