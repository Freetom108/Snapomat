import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const BG = '#000000';
const GOLD = '#E8B84B';

// Ionicons-style flash bolt (viewBox 0 0 512 512)
const FLASH_PATH =
  'M315.27 33L96 304h128l-64 176 256-224H288l64-223z';

export default function AnimatedSplash({ onFinish }) {
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.delay(1500),
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]);

    animation.start(({ finished }) => {
      if (finished) {
        onFinish?.();
      }
    });

    return () => animation.stop();
  }, [onFinish, screenOpacity]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: screenOpacity }]}>
        <Svg width={160} height={240} viewBox="0 0 512 512">
          <Path d={FLASH_PATH} fill={GOLD} />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
