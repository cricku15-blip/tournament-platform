import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    screens: {
      sm: "640px",
      lg: "1024px",
    },
    extend: {
      colors: {
        ink: "var(--ink)",
        surface: "var(--surface)",
        card: "var(--card)",
        line: "var(--line)",
        primary: {
          DEFAULT: "var(--primary)",
          ink: "var(--primary-ink)",
        },
        floodlight: "var(--floodlight)",
        "primary-hi": "var(--primary-hi)",
        clay: "var(--clay)",
        danger: "var(--danger)",
        muted: "var(--muted)",
      },
      spacing: {
        1: "4px",
        2: "8px",
        3: "12px",
        4: "16px",
        6: "24px",
        8: "32px",
        12: "48px",
        16: "64px",
        24: "96px",
      },
      borderRadius: {
        input: "12px",
        btn: "12px",
        card: "20px",
        badge: "999px",
        pill: "999px",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
