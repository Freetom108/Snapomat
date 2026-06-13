import { Pressable, Text, StyleSheet } from 'react-native';
import { getCategory } from '../constants/categories';
import { typography } from '../constants/typography';

export default function CategoryChip({ categoryId, selected, theme, onPress }) {
  const category = getCategory(categoryId);
  if (!category) return null;

  const isSelected = selected === categoryId;

  return (
    <Pressable
      onPress={() => onPress?.(categoryId)}
      style={[
        styles.chip,
        {
          backgroundColor: isSelected ? category.color + '33' : theme.card,
          borderColor: isSelected ? category.color : theme.border,
        },
      ]}
    >
      <Text style={styles.emoji}>{category.emoji}</Text>
      <Text style={[typography.label, { color: isSelected ? category.color : theme.text }]}>
        {category.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
  emoji: {
    fontSize: 14,
  },
});
