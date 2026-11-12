import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-poppins)', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        brand: {
          50: "#f0f7ff",
          100: "#e0effe",
          200: "#bae0fd",
          300: "#7cc7fb",
          400: "#38bdf8",
          500: "#1677ff",
          600: "#0b63e5",
          700: "#0952c4",
          800: "#07419e",
          900: "#0a2f70",
          950: "#071b42",
        },
        emeraldGold: {
          50: "#fbf8ee",
          100: "#f5eed4",
          200: "#ecdaa9",
          300: "#dfbf76",
          400: "#d3a54a",
          500: "#c28b30",
          600: "#aa6e26",
          700: "#865022",
          800: "#6f4122",
          900: "#5d3721",
        }
      },
    },
  },
  plugins: [],
} satisfies Config;

