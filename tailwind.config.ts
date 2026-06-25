import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        studio: {
          950: "#070908",
          900: "#0b100f",
          850: "#111715",
          800: "#171f1c",
          700: "#25302b",
          500: "#64746c",
          300: "#a5b2aa",
          100: "#eef3ef"
        },
        amberline: "#e7b65a",
        graphite: "#222823",
        ember: "#e45d43",
        signal: "#51d08a"
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(231, 182, 90, 0.14), 0 22px 70px rgba(0, 0, 0, 0.38)"
      },
      fontFamily: {
        display: ["var(--font-display)"],
        sans: ["var(--font-sans)"]
      }
    }
  },
  plugins: []
};

export default config;
