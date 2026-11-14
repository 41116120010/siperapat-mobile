import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  LayoutChangeEvent,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

export interface AutoScrollTextProps {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  speedPxPerSec?: number;
  pauseMs?: number;
  disabled?: boolean;
}

const CONTAINER_LAYOUT_KEYS = new Set<keyof TextStyle | keyof ViewStyle>([
  'flex',
  'flexGrow',
  'flexShrink',
  'flexBasis',
  'width',
  'minWidth',
  'maxWidth',
  'alignSelf',
  'margin',
  'marginTop',
  'marginBottom',
  'marginLeft',
  'marginRight',
  'marginHorizontal',
  'marginVertical',
  'padding',
  'paddingTop',
  'paddingBottom',
  'paddingLeft',
  'paddingRight',
  'paddingHorizontal',
  'paddingVertical',
]);

function splitTextAndContainerStyle(flatStyle: TextStyle | undefined): {
  extractedContainerStyle: ViewStyle;
  textOnlyStyle: TextStyle;
} {
  if (!flatStyle) {
    return { extractedContainerStyle: {}, textOnlyStyle: {} };
  }
  const extractedContainerStyle: Record<string, unknown> = {};
  const textOnlyStyle: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(flatStyle)) {
    if (value === undefined) continue;
    if (CONTAINER_LAYOUT_KEYS.has(key as keyof ViewStyle)) {
      extractedContainerStyle[key] = value;
    } else {
      textOnlyStyle[key] = value;
    }
  }

  return {
    extractedContainerStyle: extractedContainerStyle as ViewStyle,
    textOnlyStyle: textOnlyStyle as TextStyle,
  };
}

/**
 * Single-line text that automatically marquee-scrolls horizontally (ping-pong)
 * ONLY when its intrinsic single-line width exceeds the available container width.
 * Otherwise renders cleanly without animation or truncation ellipsis (...).
 */
export const AutoScrollText: React.FC<AutoScrollTextProps> = ({
  children,
  style,
  containerStyle,
  speedPxPerSec = 36,
  pauseMs = 1200,
  disabled = false,
}) => {
  const [containerWidth, setContainerWidth] = useState(0);
  const [textWidth, setTextWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;

  const flatStyle = useMemo(() => StyleSheet.flatten(style) ?? undefined, [style]);
  const { extractedContainerStyle, textOnlyStyle } = useMemo(
    () => splitTextAndContainerStyle(flatStyle),
    [flatStyle],
  );

  const overflowDistance = Math.max(0, Math.ceil(textWidth - containerWidth));
  const isOverflowing = !disabled && containerWidth > 0 && overflowDistance > 2;

  useEffect(() => {
    translateX.setValue(0);
    if (!isOverflowing) {
      return;
    }

    const targetShift = -(overflowDistance + 6);
    const forwardMs = Math.max(1200, Math.round((Math.abs(targetShift) / speedPxPerSec) * 1000));
    const returnMs = Math.max(900, Math.round(forwardMs * 0.72));

    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(pauseMs),
        Animated.timing(translateX, {
          toValue: targetShift,
          duration: forwardMs,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.delay(pauseMs),
        Animated.timing(translateX, {
          toValue: 0,
          duration: returnMs,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();
    return () => {
      loop.stop();
      translateX.setValue(0);
    };
  }, [isOverflowing, overflowDistance, pauseMs, speedPxPerSec, translateX, children]);

  const handleContainerLayout = (event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;
    setContainerWidth((prev) => (Math.abs(prev - nextWidth) > 0.5 ? nextWidth : prev));
  };

  const handleMeasureLayout = (event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;
    setTextWidth((prev) => (Math.abs(prev - nextWidth) > 0.5 ? nextWidth : prev));
  };

  return (
    <View
      onLayout={handleContainerLayout}
      style={[styles.container, extractedContainerStyle, containerStyle]}
    >
      {/* Hidden unconstrained measurer to obtain exact intrinsic single-line width */}
      <View
        style={styles.measureHost}
        pointerEvents="none"
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      >
        <Text
          numberOfLines={1}
          onLayout={handleMeasureLayout}
          style={[textOnlyStyle, styles.measureText]}
        >
          {children}
        </Text>
      </View>

      {/* Normal-flow text preserves exact line height & flex-shrink footprint */}
      <Text
        numberOfLines={1}
        ellipsizeMode="clip"
        style={[textOnlyStyle, isOverflowing && styles.hiddenPlaceholder]}
      >
        {children}
      </Text>

      {/* Smooth ping-pong marquee overlay shown only when text exceeds container width */}
      {isOverflowing ? (
        <View
          style={styles.marqueeOverlay}
          pointerEvents="none"
          accessible={false}
          importantForAccessibility="no-hide-descendants"
        >
          <Animated.View
            style={[
              styles.marqueeMover,
              {
                width: Math.ceil(textWidth) + 12,
                transform: [{ translateX }],
              },
            ]}
          >
            <Text numberOfLines={1} style={[textOnlyStyle, styles.marqueeText]}>
              {children}
            </Text>
          </Animated.View>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    flexShrink: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  measureHost: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 4000,
    flexDirection: 'row',
    opacity: 0,
  },
  measureText: {
    flexShrink: 0,
  },
  hiddenPlaceholder: {
    opacity: 0,
  },
  marqueeOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  marqueeMover: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  marqueeText: {
    flexShrink: 0,
  },
});
