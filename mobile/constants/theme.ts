/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from "react-native";

// 柔らかく親しみやすいカラーパレット
const tintColorLight = "#FF6B6B"; // 優しいピンク
const tintColorDark = "#FFB3B3"; // より淡いピンク

export const Colors = {
  light: {
    text: "#2C3E50",
    background: "#FEFEFE",
    tint: tintColorLight,
    icon: "#7F8C8D",
    tabIconDefault: "#BDC3C7",
    tabIconSelected: tintColorLight,
    primary: "#FF6B6B",
    secondary: "#4ECDC4",
    accent: "#45B7D1",
    success: "#96CEB4",
    warning: "#FFEAA7",
    error: "#FF7675",
    surface: "#FFFFFF",
    surfaceSecondary: "#F8F9FA",
    border: "#E9ECEF",
    placeholder: "#95A5A6",
  },
  dark: {
    text: "#ECF0F1",
    background: "#1A1A1A",
    tint: tintColorDark,
    icon: "#95A5A6",
    tabIconDefault: "#7F8C8D",
    tabIconSelected: tintColorDark,
    primary: "#FFB3B3",
    secondary: "#81ECEC",
    accent: "#74B9FF",
    success: "#00B894",
    warning: "#FDCB6E",
    error: "#E17055",
    surface: "#2D3436",
    surfaceSecondary: "#636E72",
    border: "#636E72",
    placeholder: "#B2BEC3",
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: "system-ui",
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: "ui-serif",
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
