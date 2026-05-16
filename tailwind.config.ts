import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0A0908",
          soft: "#161412",
          muted: "#22201D",
        },
        cream: {
          DEFAULT: "#F2F0E6",
          soft: "#E8E5D7",
          muted: "#C7C3B3",
          dim: "#8A8678",
        },
        accent: {
          DEFAULT: "#E8B86D",
          deep: "#C97D3F",
          subtle: "#7A5A33",
        },
        good: "#7FB069",
        bad: "#D96A6A",
      },
      fontFamily: {
        serif: ['"Instrument Serif"', "ui-serif", "Georgia", "serif"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        kn: ['"Noto Sans Kannada"', "Inter", "sans-serif"],
      },
      letterSpacing: {
        tight2: "-0.02em",
      },
    },
  },
  plugins: [],
};

export default config;
