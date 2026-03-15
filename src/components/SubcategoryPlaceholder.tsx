import React, { useEffect, useRef } from "react";
import { Animated } from "react-native";
import Svg, { Path, Rect, Circle } from "react-native-svg";

type Props = {
  subtypeName: string;
  size?: number;
};

// Animated wrapper for the SVG so the breathing effect works
const AnimatedSvg = Animated.createAnimatedComponent(Svg);

// SVG path data for each subtype — simple line-art silhouettes
const PATHS: Record<string, React.ReactNode> = {
  "T-Shirt": (
    <>
      {/* Body */}
      <Path d="M30 20 L10 35 L20 40 L20 80 L60 80 L60 40 L70 35 L50 20" stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* Left sleeve */}
      <Path d="M30 20 L10 35 L20 40 L30 28" stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* Right sleeve */}
      <Path d="M50 20 L70 35 L60 40 L50 28" stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* Neck */}
      <Path d="M30 20 Q40 28 50 20" stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round" />
    </>
  ),
  "Shirt": (
    <>
      <Path d="M28 18 L8 33 L18 38 L18 82 L62 82 L62 38 L72 33 L52 18" stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M28 18 L8 33 L18 38 L28 26" stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M52 18 L72 33 L62 38 L52 26" stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* Collar */}
      <Path d="M28 18 L40 26 L52 18" stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round" />
      <Path d="M40 26 L40 42" stroke="#000" strokeWidth="2" fill="none" strokeLinecap="round" />
    </>
  ),
  "Hoodie": (
    <>
      <Path d="M30 22 L8 36 L18 42 L18 82 L62 82 L62 42 L72 36 L50 22" stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M30 22 L8 36 L18 42 L28 30" stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M50 22 L72 36 L62 42 L52 30" stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* Hood */}
      <Path d="M30 22 Q40 10 50 22 Q44 20 40 24 Q36 20 30 22" stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* Kangaroo pocket */}
      <Path d="M28 60 L28 75 L52 75 L52 60" stroke="#000" strokeWidth="2" fill="none" strokeLinecap="round" />
    </>
  ),
  "Jacket": (
    <>
      <Path d="M28 18 L6 34 L18 40 L18 82 L62 82 L62 40 L74 34 L52 18" stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M28 18 L6 34 L18 40 L26 28" stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M52 18 L74 34 L62 40 L54 28" stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* Lapels */}
      <Path d="M28 18 L36 32 L40 38" stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round" />
      <Path d="M52 18 L44 32 L40 38" stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* Center zip line */}
      <Path d="M40 38 L40 82" stroke="#000" strokeWidth="2" fill="none" strokeLinecap="round" strokeDasharray="4,3" />
    </>
  ),
  "Sweater": (
    <>
      <Path d="M30 20 L10 35 L20 40 L20 80 L60 80 L60 40 L70 35 L50 20" stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M30 20 L10 35 L20 40 L30 28" stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M50 20 L70 35 L60 40 L50 28" stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* Crew neck */}
      <Path d="M30 20 Q40 26 50 20" stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* Ribbing lines at bottom */}
      <Path d="M20 76 L60 76" stroke="#000" strokeWidth="1.5" fill="none" />
      <Path d="M20 79 L60 79" stroke="#000" strokeWidth="1.5" fill="none" />
    </>
  ),
  "Coat": (
    <>
      <Path d="M26 16 L4 34 L18 42 L18 86 L62 86 L62 42 L76 34 L54 16" stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M26 16 L4 34 L18 42 L24 30" stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M54 16 L76 34 L62 42 L56 30" stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M26 16 L36 32 L40 42" stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round" />
      <Path d="M54 16 L44 32 L40 42" stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round" />
      <Path d="M40 42 L40 86" stroke="#000" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Buttons */}
      <Circle cx="40" cy="54" r="2" fill="#000" />
      <Circle cx="40" cy="64" r="2" fill="#000" />
      <Circle cx="40" cy="74" r="2" fill="#000" />
    </>
  ),
  "Jeans": (
    <>
      {/* Waistband */}
      <Rect x="18" y="14" width="44" height="10" rx="2" stroke="#000" strokeWidth="3" fill="none" />
      {/* Left leg */}
      <Path d="M18 24 L18 86 L38 86 L40 50 L42 86 L62 86 L62 24" stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* Fly */}
      <Path d="M40 24 L40 36" stroke="#000" strokeWidth="2" fill="none" strokeLinecap="round" />
    </>
  ),
  "Pants": (
    <>
      <Rect x="18" y="14" width="44" height="8" rx="2" stroke="#000" strokeWidth="3" fill="none" />
      <Path d="M18 22 L18 86 L38 86 L40 50 L42 86 L62 86 L62 22" stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M40 22 L40 34" stroke="#000" strokeWidth="2" fill="none" strokeLinecap="round" />
    </>
  ),
  "Shorts": (
    <>
      <Rect x="18" y="14" width="44" height="8" rx="2" stroke="#000" strokeWidth="3" fill="none" />
      <Path d="M18 22 L18 56 L38 56 L40 44 L42 56 L62 56 L62 22" stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M40 22 L40 32" stroke="#000" strokeWidth="2" fill="none" strokeLinecap="round" />
    </>
  ),
  "Skirt": (
    <>
      <Rect x="22" y="14" width="36" height="8" rx="2" stroke="#000" strokeWidth="3" fill="none" />
      <Path d="M22 22 L14 80 L66 80 L58 22" stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  "Sneaker": (
    <>
      {/* Sole */}
      <Path d="M8 72 Q8 80 20 82 L72 82 Q82 80 82 72 L82 68 L8 68 Z" stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* Upper body */}
      <Path d="M8 68 L8 50 Q10 40 20 38 L50 36 Q60 36 66 44 L82 68" stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* Tongue */}
      <Path d="M36 36 L34 58" stroke="#000" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Lace holes */}
      <Path d="M38 44 L52 46" stroke="#000" strokeWidth="1.5" fill="none" />
      <Path d="M37 52 L54 54" stroke="#000" strokeWidth="1.5" fill="none" />
      <Path d="M36 60 L56 62" stroke="#000" strokeWidth="1.5" fill="none" />
    </>
  ),
  "Boot": (
    <>
      {/* Shaft */}
      <Path d="M22 14 L22 60 Q22 70 18 74 L8 78 Q8 84 14 86 L72 86 Q78 84 78 78 L78 72 L32 72 L32 14 Z" stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* Sole ridge */}
      <Path d="M8 82 L72 82" stroke="#000" strokeWidth="2" fill="none" />
      {/* Lace area */}
      <Path d="M24 30 L30 30" stroke="#000" strokeWidth="2" fill="none" />
      <Path d="M24 38 L30 38" stroke="#000" strokeWidth="2" fill="none" />
      <Path d="M24 46 L30 46" stroke="#000" strokeWidth="2" fill="none" />
    </>
  ),
  "Sandal": (
    <>
      {/* Sole */}
      <Path d="M10 76 Q10 86 50 86 Q90 86 90 76 L90 72 L10 72 Z" stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* Toe strap */}
      <Path d="M28 72 L28 60 Q50 52 72 60 L72 72" stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* Ankle strap */}
      <Path d="M18 72 L18 50 Q50 44 82 50 L82 72" stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round" />
    </>
  ),
  "Loafer": (
    <>
      <Path d="M10 66 Q10 80 30 84 L70 84 Q86 80 86 66 L86 60 L10 60 Z" stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M10 60 L10 46 Q12 36 28 34 L60 34 Q72 36 80 46 L86 60" stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* Bit detail */}
      <Path d="M36 40 L60 40" stroke="#000" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <Path d="M40 36 L40 44" stroke="#000" strokeWidth="1.5" fill="none" />
      <Path d="M48 36 L48 44" stroke="#000" strokeWidth="1.5" fill="none" />
      <Path d="M56 36 L56 44" stroke="#000" strokeWidth="1.5" fill="none" />
    </>
  ),
  "Slipper": (
    <>
      <Path d="M8 62 Q8 78 50 80 Q92 78 92 62 L86 52 Q70 44 40 46 Q16 48 8 62 Z" stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M8 62 Q20 54 40 52 L86 52" stroke="#000" strokeWidth="2" fill="none" />
    </>
  ),
};

const FALLBACK_ICON = (
  <>
    <Rect x="20" y="20" width="60" height="60" rx="8" stroke="#000" strokeWidth="3" fill="none" />
    <Path d="M35 50 L50 35 L65 50" stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M50 35 L50 65" stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round" />
  </>
);

export default function SubcategoryPlaceholder({ subtypeName, size = 120 }: Props) {
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1.0,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const paths = PATHS[subtypeName] ?? FALLBACK_ICON;

  return (
    <AnimatedSvg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{ opacity, backgroundColor: "#f3f4f6", borderRadius: 12 }}
    >
      {paths}
    </AnimatedSvg>
  );
}
