import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTranslation } from '../hooks/useTranslation';
import { formatAmountNumber } from '../utils/expenseHelpers';

export const RING_RADIUS = 95;
export const RING_STROKE = 10;
export const RING_SIZE = RING_RADIUS * 2 + RING_STROKE;

export default function ExpenseRing({ stats, colors, styles, showMonthLabel = true }) {
  const { t } = useTranslation();
  const cx = RING_SIZE / 2;
  const cy = RING_SIZE / 2;
  const circumference = 2 * Math.PI * RING_RADIUS;
  const strokeDashoffset = circumference * (1 - stats.progress);

  return (
    <View style={styles.ringSection}>
      {showMonthLabel ? <Text style={styles.monthLabel}>{stats.monthLabel}</Text> : null}
      <View style={styles.ringWrap}>
        <Svg width={RING_SIZE} height={RING_SIZE}>
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
            stroke={colors.accent}
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
          <Text style={styles.ringLabel}>{t('home.ringExpenses')}</Text>
          <Text style={styles.ringAmount}>{formatAmountNumber(stats.spent)}</Text>
          <Text style={styles.ringPercent}>{stats.percent}%</Text>
          <Text style={styles.ringBudget}>{t('home.ringBudgetOf', { amount: stats.budgetFormatted })}</Text>
        </View>
      </View>
    </View>
  );
}
