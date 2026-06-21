import { useCallback, useState } from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from '../hooks/useTranslation';
import { getBudgetWarning } from '../store/storage';
import { formatAmountNumber } from '../utils/expenseHelpers';

export const RING_RADIUS = 95;
export const RING_STROKE = 10;
export const RING_SIZE = RING_RADIUS * 2 + RING_STROKE;

export default function ExpenseRing({ stats, colors, styles, showMonthLabel = true }) {
  const { t } = useTranslation();
  const [warningActive, setWarningActive] = useState(true);
  const [budgetWarning, setBudgetWarning] = useState(80);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function loadWarning() {
        const [storedActive, storedThreshold] = await Promise.all([
          AsyncStorage.getItem('budget_warning_active'),
          getBudgetWarning(),
        ]);
        if (!active) return;
        setWarningActive(storedActive === null ? true : storedActive === 'true');
        setBudgetWarning(storedThreshold);
      }
      loadWarning();
      return () => {
        active = false;
      };
    }, []),
  );

  const cx = RING_SIZE / 2;
  const cy = RING_SIZE / 2;
  const circumference = 2 * Math.PI * RING_RADIUS;
  const strokeDashoffset = circumference * (1 - stats.progress);
  const isNippon = colors.id === 'nippon';
  const nipponTextStyle = isNippon ? { color: '#FFFFFF' } : null;
  const isWarning = warningActive && stats.percent >= budgetWarning;
  const arcColor = isWarning ? '#8B0000' : colors.accent;

  return (
    <View style={styles.ringSection}>
      {showMonthLabel ? <Text style={styles.monthLabel}>{stats.monthLabel}</Text> : null}
      <View style={styles.ringWrap}>
        <Svg width={RING_SIZE} height={RING_SIZE}>
          {isNippon ? (
            <Circle cx={cx} cy={cy} r={RING_RADIUS - RING_STROKE / 2} fill="#BC002D" />
          ) : null}
          <Circle
            cx={cx}
            cy={cy}
            r={RING_RADIUS}
            stroke={colors.border}
            strokeWidth={RING_STROKE}
            fill="none"
          />
          <Circle
            cx={cx}
            cy={cy}
            r={RING_RADIUS}
            stroke={arcColor}
            strokeWidth={RING_STROKE}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${cx}, ${cy}`}
          />
        </Svg>
        <View style={styles.ringCenter}>
          <Text style={[styles.ringLabel, nipponTextStyle]}>{t('home.ringExpenses')}</Text>
          <Text style={[styles.ringAmount, nipponTextStyle]}>{formatAmountNumber(stats.spent)}</Text>
          <Text style={[styles.ringPercent, nipponTextStyle]}>{stats.percent}%</Text>
          <Text style={[styles.ringBudget, nipponTextStyle]}>{t('home.ringBudgetOf', { amount: stats.budgetFormatted })}</Text>
        </View>
      </View>
    </View>
  );
}
