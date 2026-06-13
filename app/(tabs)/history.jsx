import { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  useFonts,
  DMSans_400Regular,
  DMSans_700Bold,
  DMSans_800ExtraBold,
  DMSans_900Black,
} from '@expo-google-fonts/dm-sans';
import { CATEGORY_LIST } from '../../constants/categories';
import { useTheme } from '../../hooks/useTheme';
import { getExpenses } from '../../store/storage';
import ExpenseRow from '../../components/ExpenseRow';
import ExpenseDetailSheet from '../../components/ExpenseDetailSheet';
import EmptyState from '../../components/EmptyState';
import {
  formatMonthLabel,
  getMonthExpenses,
  toRowExpense,
} from '../../utils/expenseHelpers';

function withAlpha(hex, alpha) {
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
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
      flexGrow: 1,
    },
    header: {
      marginBottom: 12,
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
    toolbar: {
      marginBottom: 0,
    },
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 10,
      marginBottom: 12,
      gap: 6,
      minHeight: 34,
    },
    searchInput: {
      flex: 1,
      fontFamily: 'DMSans_400Regular',
      fontSize: 14,
      color: colors.text,
      paddingVertical: 6,
    },
    chipScroll: {
      marginBottom: 8,
      marginHorizontal: -20,
      flexGrow: 0,
    },
    chipRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 20,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 7,
      paddingHorizontal: 13,
      borderRadius: 20,
      borderWidth: 1,
    },
    chipEmoji: {
      fontSize: 13,
    },
    chipLabel: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 13,
    },
    monthNav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
      gap: 12,
    },
    monthButton: {
      padding: 4,
    },
    monthChevron: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 24,
      color: colors.text,
      lineHeight: 26,
    },
    monthLabel: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 13,
      color: colors.text,
      letterSpacing: 1,
      textTransform: 'uppercase',
      textAlign: 'center',
      minWidth: 130,
    },
    list: {
      gap: 8,
    },
  });
}

export default function HistoryScreen() {
  const { colors, theme, ready: themeReady } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [monthDate, setMonthDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_700Bold,
    DMSans_800ExtraBold,
    DMSans_900Black,
  });

  const loadData = useCallback(async () => {
    const storedExpenses = await getExpenses();
    setExpenses(storedExpenses);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();

  const monthExpenses = getMonthExpenses(expenses, year, month);

  const filtered = monthExpenses.filter((expense) => {
    const matchesCategory = !selectedCategory || expense.category === selectedCategory;
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || (expense.merchant ?? '').toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  function shiftMonth(delta) {
    setMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
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
          <Text style={styles.screenTitle}>History</Text>
        </View>

        <View style={styles.toolbar}>
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={16} color={colors.muted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Händler suchen..."
              placeholderTextColor={colors.muted}
              style={styles.searchInput}
            />
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipScroll}
            contentContainerStyle={styles.chipRow}
          >
            <Pressable
              onPress={() => setSelectedCategory(null)}
              style={[
                styles.chip,
                {
                  backgroundColor: !selectedCategory ? withAlpha(colors.accent, 0.22) : colors.card,
                  borderColor: !selectedCategory ? colors.accent : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipLabel,
                  { color: !selectedCategory ? colors.accent : colors.muted },
                ]}
              >
                Alle
              </Text>
            </Pressable>
            {CATEGORY_LIST.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => setSelectedCategory(isSelected ? null : cat.id)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isSelected ? withAlpha(cat.color, 0.22) : colors.card,
                      borderColor: isSelected ? cat.color : colors.border,
                    },
                  ]}
                >
                  <Text style={styles.chipEmoji}>{cat.emoji}</Text>
                  <Text
                    style={[styles.chipLabel, { color: isSelected ? cat.color : colors.muted }]}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.monthNav}>
            <Pressable onPress={() => shiftMonth(-1)} style={styles.monthButton}>
              <Text style={styles.monthChevron}>‹</Text>
            </Pressable>
            <Text style={styles.monthLabel}>{formatMonthLabel(year, month)}</Text>
            <Pressable onPress={() => shiftMonth(1)} style={styles.monthButton}>
              <Text style={styles.monthChevron}>›</Text>
            </Pressable>
          </View>
        </View>

        {filtered.length === 0 ? (
          <EmptyState emoji="📋" title="Keine Buchungen in diesem Monat" theme={theme} />
        ) : (
          <View style={styles.list}>
            {filtered.map((item) => (
              <ExpenseRow
                key={item.id}
                expense={toRowExpense(item)}
                theme={theme}
                onPress={() => setSelectedExpense(item)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <ExpenseDetailSheet
        visible={!!selectedExpense}
        expense={selectedExpense}
        colors={colors}
        onClose={() => setSelectedExpense(null)}
        onChanged={loadData}
      />
    </>
  );
}
