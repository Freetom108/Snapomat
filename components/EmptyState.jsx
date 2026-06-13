import { View, Text, StyleSheet } from 'react-native';
import { typography } from '../constants/typography';

export default function EmptyState({ emoji = '📭', title, subtitle, theme }) {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={[typography.title, { color: theme.text, textAlign: 'center' }]}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={[typography.body, { color: theme.muted, textAlign: 'center' }]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 8,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 8,
  },
});
