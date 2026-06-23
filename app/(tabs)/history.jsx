import { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
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
import { getCategory, getCategoryLabel } from '../../constants/categories';

const HISTORY_CATEGORY_ORDER = ['home', 'food', 'fixed', 'mobility', 'shopping', 'going-out', 'health'];
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { getExpenses, saveHistorySelectedMonth, getHistorySelectedMonth } from '../../store/storage';
import ExpenseRow from '../../components/ExpenseRow';
import ExpenseDetailSheet from '../../components/ExpenseDetailSheet';
import EmptyState from '../../components/EmptyState';
import {
  formatCurrency,
  formatMonthLabel,
  getMonthExpenses,
  parseExpenseDate,
  toRowExpense,
} from '../../utils/expenseHelpers';

function groupExpensesByMonth(expenses) {
  const map = new Map();

  expenses.forEach((expense) => {
    const date = parseExpenseDate(expense.date);
    const year = date.getFullYear();
    const month = date.getMonth();
    const key = `${year}-${month}`;

    if (!map.has(key)) {
      map.set(key, {
        id: key,
        year,
        month,
        label: formatMonthLabel(year, month),
        items: [],
      });
    }

    map.get(key).items.push(expense);
  });

  return Array.from(map.values())
    .sort((a, b) => b.year - a.year || b.month - a.month)
    .map((group) => ({
      ...group,
      items: [...group.items].sort(
        (a, b) => parseExpenseDate(b.date) - parseExpenseDate(a.date),
      ),
    }));
}

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
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    monthChevron: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 24,
      color: colors.text,
      lineHeight: 26,
    },
    monthLabel: {
      fontFamily: 'DMSans_900Black',
      fontSize: 14,
      color: colors.text,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      textAlign: 'center',
      minWidth: 130,
    },
    list: {
      gap: 8,
    },
    monthGroup: {
      marginBottom: 20,
    },
    monthGroupLabel: {
      fontFamily: 'DMSans_800ExtraBold',
      fontSize: 11,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: colors.muted,
      marginBottom: 10,
    },
    monthNavDisabled: {
      opacity: 0.35,
    },
    summaryLine: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 12,
      color: colors.muted,
      textAlign: 'center',
      paddingVertical: 8,
    },
  });
}

export default function HistoryScreen() {
  const { t, locale } = useTranslation();
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

  const handleExpenseChanged = useCallback(async () => {
    setSelectedExpense(null);
    await loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function restoreSelectedMonth() {
        const saved = await getHistorySelectedMonth();
        if (!active) return;
        if (saved) {
          setMonthDate(new Date(saved.year, saved.month, 1));
          return;
        }
        const now = new Date();
        await saveHistorySelectedMonth(now.getFullYear(), now.getMonth());
      }

      restoreSelectedMonth();
      return () => {
        active = false;
      };
    }, []),
  );

  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();

  const isSearching = search.trim().length > 0;

  const filteredExpenses = useMemo(() => {
    const query = search.trim().toLowerCase();
    return expenses.filter((expense) => {
      const matchesCategory = !selectedCategory || expense.category === selectedCategory;
      const matchesSearch = !query || (expense.merchant ?? '').toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [expenses, search, selectedCategory]);

  const monthExpenses = useMemo(() => {
    if (isSearching) return filteredExpenses;
    return getMonthExpenses(filteredExpenses, year, month);
  }, [filteredExpenses, isSearching, year, month]);

  const searchGroups = useMemo(() => {
    if (!isSearching) return [];
    return groupExpensesByMonth(filteredExpenses);
  }, [filteredExpenses, isSearching]);

  const displayedExpenses = isSearching ? filteredExpenses : monthExpenses;
  const displayedCount = displayedExpenses.length;
  const displayedTotal = useMemo(
    () => displayedExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0),
    [displayedExpenses],
  );

  function handleSearchChange(value) {
    setSearch(value);
    if (!value.trim()) {
      const now = new Date();
      const next = new Date(now.getFullYear(), now.getMonth(), 1);
      setMonthDate(next);
      saveHistorySelectedMonth(next.getFullYear(), next.getMonth());
    }
  }

  function shiftMonth(delta) {
    if (isSearching) return;
    setMonthDate((prev) => {
      const next = new Date(prev.getFullYear(), prev.getMonth() + delta, 1);
      saveHistorySelectedMonth(next.getFullYear(), next.getMonth());
      return next;
    });
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
              onChangeText={handleSearchChange}
              placeholder={t('history.searchPlaceholder')}
              placeholderTextColor={colors.muted}
              style={styles.searchInput}
            />
            {search.length > 0 ? (
              <Pressable
                onPress={() => {
                  setSearch('');
                  Keyboard.dismiss();
                }}
                hitSlop={10}
                style={({ pressed }) => [pressed && { opacity: 0.6 }]}
                accessibilityRole="button"
              >
                <Text style={{ color: colors.muted, fontSize: 16 }}>✕</Text>
              </Pressable>
            ) : null}
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
                {t('common.all')}
              </Text>
            </Pressable>
            {HISTORY_CATEGORY_ORDER.map((catId) => {
              const cat = getCategory(catId);
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
                    {getCategoryLabel(cat.id)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={[styles.monthNav, isSearching && styles.monthNavDisabled]}>
            <Pressable
              onPress={() => shiftMonth(-1)}
              disabled={isSearching}
              style={styles.monthButton}
            >
              <Text style={styles.monthChevron}>‹</Text>
            </Pressable>
            <Text style={styles.monthLabel}>
              {isSearching ? t('history.allResults') : formatMonthLabel(year, month)}
            </Text>
            <Pressable
              onPress={() => shiftMonth(1)}
              disabled={isSearching}
              style={styles.monthButton}
            >
              <Text style={styles.monthChevron}>›</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.summaryLine}>
          {t('history.summary', { count: displayedCount, total: formatCurrency(displayedTotal) })}
        </Text>

        {isSearching ? (
          searchGroups.length === 0 ? (
            <EmptyState emoji="🔍" title={t('history.noSearchResults')} theme={theme} />
          ) : (
            searchGroups.map((group) => (
              <View key={group.id} style={styles.monthGroup}>
                <Text style={styles.monthGroupLabel}>{group.label}</Text>
                <View style={styles.list}>
                  {group.items.map((item, index) => (
                    <ExpenseRow
                      key={`${item.id}-${index}`}
                      expense={toRowExpense(item)}
                      theme={theme}
                      onPress={() => setSelectedExpense(item)}
                    />
                  ))}
                </View>
              </View>
            ))
          )
        ) : monthExpenses.length === 0 ? (
          <EmptyState emoji="📋" title={t('history.noMonthExpenses')} theme={theme} />
        ) : (
          <View style={styles.list}>
            {monthExpenses.map((item, index) => (
              <ExpenseRow
                key={`${item.id}-${index}`}
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
        onClose={() => setSelectedExpense(null)}
        onChanged={handleExpenseChanged}
      />
    </>
  );
}
