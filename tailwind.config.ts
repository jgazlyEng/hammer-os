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
          950: "#202523",
          900: "#282f2b",
          850: "#303833",
          800: "#3a433e",
          700: "#4a554f",
          500: "#64746c",
          300: "#a5b2aa",
          100: "#eef3ef"
        },
        amberline: "#51d08a",
        graphite: "#222823",
        ember: "#e45d43",
        signal: "#51d08a"
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(81, 208, 138, 0.16), 0 22px 70px rgba(0, 0, 0, 0.38)"
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
