import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Pretendard Variable",
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "Roboto",
          "Helvetica Neue",
          "Segoe UI",
          "sans-serif",
        ],
        serif: [
          "Noto Serif KR",
          "ui-serif",
          "Georgia",
          "serif",
        ],
      },
      fontSize: {
        "display": ["clamp(2.75rem, 1.5rem + 5vw, 6rem)", { lineHeight: "1.05", letterSpacing: "-0.03em" }],
        "headline": ["clamp(1.75rem, 1rem + 2.5vw, 3rem)", { lineHeight: "1.15", letterSpacing: "-0.02em" }],
      },
      colors: {
        ink: "#0a0a0a",
        paper: "#fafaf7",
        muted: "#6b6b6b",
        rule: "#e5e5e0",
      },
      maxWidth: {
        prose: "68ch",
        page: "1280px",
      },
    },
  },
  plugins: [],
};

export default config;
