import React, { useEffect } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export const Skeleton = ({ 
  width = "100%", 
  height = 20, 
  borderRadius = 8,
  style 
}: SkeletonProps) => {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1500 }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(shimmer.value, [0, 0.5, 1], [0.3, 0.6, 0.3]);
    return { opacity };
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: "#E5E7EB",
        },
        animatedStyle,
        style,
      ]}
    />
  );
};

// 卡片骨架屏
export const CardSkeleton = () => (
  <View style={cardStyles.card}>
    <Skeleton width="100%" height={180} borderRadius={16} />
    <View style={cardStyles.content}>
      <Skeleton width="80%" height={16} style={{ marginBottom: 8 }} />
      <Skeleton width="60%" height={14} style={{ marginBottom: 12 }} />
      <View style={cardStyles.footer}>
        <Skeleton width={60} height={12} />
        <Skeleton width={40} height={20} borderRadius={10} />
      </View>
    </View>
  </View>
);

// 列表骨架屏
export const ListSkeleton = ({ count = 3 }: { count?: number }) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <CardSkeleton key={i} />
    ))}
  </>
);

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
  },
  content: {
    padding: 16,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
