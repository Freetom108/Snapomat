import { useMemo, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  useFonts,
  DMSans_400Regular,
  DMSans_700Bold,
  DMSans_800ExtraBold,
  DMSans_900Black,
} from '@expo-google-fonts/dm-sans';
import ExpenseDetailSheet from '../../components/ExpenseDetailSheet';
import ExpenseRing, { RING_SIZE } from '../../components/ExpenseRing';
import ExpenseRow from '../../components/ExpenseRow';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { getExpenses, getBudget, getSavingsGoal } from '../../store/storage';
import {
  formatAmountNumber,
  getMonthExpenses,
  parseExpenseDate,
  toRowExpense,
  calcMonthStats,
  initCurrency,
} from '../../utils/expenseHelpers';

function StatsRow({ stats, budget, savingsGoal, colors, styles }) {
  const { t } = useTranslation();
  const remainingDisplay = formatAmountNumber(Math.max(stats.remaining, 0));
  const showSavings = savingsGoal?.active && savingsGoal?.show;

  return (
    <View style={styles.statsRow}>
      <View style={styles.statCell}>
        <Text
          style={styles.statValueGold}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {stats.avgPerDay}
        </Text>
        <Text style={styles.statLabel}>{t('home.statsAvgSpent')}</Text>
        <Text style={styles.statLabel}>{t('common.perDay')}</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statCell}>
        <Text
          style={styles.statValueWhite}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {remainingDisplay} / {formatAmountNumber(budget)}
        </Text>
        <Text style={styles.statLabel}>{t('home.statsAvailable')}</Text>
        <Text style={styles.statLabel}>{t('home.statsBudget')}</Text>
        {showSavings ? (
          <Text style={styles.statSavings}>
            {t('home.savingsGoal', { amount: formatAmountNumber(savingsGoal.amount) })}
          </Text>
        ) : null}
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statCell}>
        <Text
          style={styles.statValueWhite}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {stats.perDayLeft}
        </Text>
        <Text style={styles.statLabel}>{t('home.statsAvgAvailable')}</Text>
        <Text style={styles.statLabel}>{t('common.perDay')}</Text>
      </View>
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
    content: {
      paddingHorizontal: 20,
      paddingTop: 50,
      paddingBottom: 32,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
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
    creditsButton: {
      padding: 4,
    },
    creditsIcon: {
      fontSize: 28,
      color: colors.accent,
    },
    ringSection: {
      alignItems: 'center',
      marginTop: 16,
    },
    monthLabel: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 12,
      color: colors.muted,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      marginBottom: 16,
    },
    ringWrap: {
      width: RING_SIZE,
      height: RING_SIZE,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ringCenter: {
      position: 'absolute',
      alignItems: 'center',
    },
    ringLabel: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 11,
      color: colors.muted,
    },
    ringAmount: {
      fontFamily: 'DMSans_900Black',
      fontSize: 36,
      color: colors.text,
      lineHeight: 42,
    },
    ringPercent: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 13,
      color: colors.accent,
      marginTop: 2,
    },
    ringBudget: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 11,
      color: colors.muted,
      marginTop: 2,
    },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: colors.border,
      paddingVertical: 16,
      marginTop: 24,
      marginBottom: 24,
    },
    statCell: {
      flex: 1,
      alignItems: 'center',
      gap: 2,
    },
    statDivider: {
      width: 1,
      height: 40,
      backgroundColor: colors.border,
    },
    statValueGold: {
      fontFamily: 'DMSans_800ExtraBold',
      fontSize: 17,
      color: colors.accent,
      width: '100%',
      textAlign: 'center',
    },
    statValueWhite: {
      fontFamily: 'DMSans_800ExtraBold',
      fontSize: 17,
      color: colors.text,
      width: '100%',
      textAlign: 'center',
    },
    statLabel: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 10,
      color: colors.muted,
      textAlign: 'center',
      lineHeight: 14,
    },
    statSavings: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 10,
      color: colors.muted,
      textAlign: 'center',
      lineHeight: 14,
      marginTop: 2,
    },
    list: {
      gap: 8,
    },
    emptyText: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 15,
      color: colors.muted,
      textAlign: 'center',
      marginTop: 8,
    },
  });
}

export default function HomeScreen() {
  const { t, locale } = useTranslation();
  const { colors, theme, ready: themeReady } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [expenses, setExpenses] = useState([]);
  const [budget, setBudget] = useState(1000);
  const [savingsGoal, setSavingsGoal] = useState({ active: false, amount: 0, show: false });
  const [loading, setLoading] = useState(true);
  const [selectedExpense, setSelectedExpense] = useState(null);

  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_700Bold,
    DMSans_800ExtraBold,
    DMSans_900Black,
  });

  const loadData = useCallback(async () => {
    await initCurrency();
    const [storedExpenses, storedBudget, storedSavings] = await Promise.all([
      getExpenses(),
      getBudget(),
      getSavingsGoal(),
    ]);
    setExpenses(storedExpenses);
    setBudget(storedBudget);
    setSavingsGoal(storedSavings);
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

  const now = new Date();
  const monthExpenses = getMonthExpenses(expenses, now.getFullYear(), now.getMonth());
  const stats = calcMonthStats(expenses, budget, now);
  const sortedMonthExpenses = useMemo(
    () =>
      [...monthExpenses].sort(
        (a, b) => parseExpenseDate(b.date) - parseExpenseDate(a.date),
      ),
    [monthExpenses, locale],
  );

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
          <View>
            <Text style={styles.brand}>SNAPOMAT</Text>
            <Text style={styles.screenTitle}>Today</Text>
          </View>
          <TouchableOpacity style={styles.creditsButton} activeOpacity={0.7}>
            <Text style={styles.creditsIcon}>⚡</Text>
          </TouchableOpacity>
        </View>

        <ExpenseRing stats={stats} colors={colors} styles={styles} />
        <StatsRow stats={stats} budget={budget} savingsGoal={savingsGoal} colors={colors} styles={styles} />

        {sortedMonthExpenses.length === 0 ? (
          <Text style={styles.emptyText}>{t('home.emptyMonth')}</Text>
        ) : (
          <View style={styles.list}>
            {sortedMonthExpenses.map((item, index) => (
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
